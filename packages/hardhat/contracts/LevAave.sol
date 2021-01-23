pragma solidity 0.6.12;

import { FlashLoanReceiverBase } from "./FlashLoanReceiverBase.sol";
import { ILendingPool } from "./ILendingPool.sol";
import { ILendingPoolAddressesProvider } from "./ILendingPoolAddressesProvider.sol";
import { IERC20 } from "./IERC20.sol";

interface IOneSplit {
    function getExpectedReturn(
        IERC20,
        IERC20,
        uint256,
        uint256,
        uint256
    ) external view returns (uint256, uint256[] memory);

    function swap(
        IERC20,
        IERC20,
        uint256,
        uint256,
        uint256[] memory,
        uint256
    ) external payable returns (uint256);
}

contract LevAave is FlashLoanReceiverBase {
    IOneSplit oneInch = IOneSplit(0x50FDA034C0Ce7a8f7EFDAebDA7Aa7cA21CC1267e);
    ILendingPool pool = ILendingPool(0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9);

    constructor(ILendingPoolAddressesProvider _addressProvider) public FlashLoanReceiverBase(_addressProvider) {}

    struct SlotInfo {
        uint256 balance;
        uint256 wethBalance;
        uint256 awethBalance;
        address sender;
        address positionAsset;
        address apositionAsset;
        uint256 variableDebt;
        uint256 amount;
        address asset;
        uint256 operation;
        address collateralAsset;
        uint256 collateralAmount;
    }

    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        // necessary for variables limits
        SlotInfo memory slot;
        slot.amount = amounts[0];
        slot.asset = assets[0];
        (
            slot.sender,
            slot.positionAsset,
            slot.apositionAsset,
            slot.collateralAsset,
            slot.operation,
            slot.collateralAmount
        ) = abi.decode(params, (address, address, address, address, uint256, uint256));
        //open long position
        if (slot.operation == 0) {
            // transfer collateral from user to contract
            IERC20(slot.asset).transferFrom(slot.sender, address(this), slot.amount.div(2));
            // update collateral balance
            slot.balance = IERC20(slot.asset).balanceOf(address(this));
            // get 1inch v1 distribution
            (uint256 returnAmount, uint256[] memory distribution) =
                oneInch.getExpectedReturn(IERC20(assets[0]), IERC20(slot.positionAsset), slot.balance, 10, 0);
            // if no 1inch allowance, approve
            if (IERC20(slot.asset).allowance(address(this), address(oneInch)) < slot.balance) {
                IERC20(slot.asset).approve(address(oneInch), uint256(-1));
            }
            // 1inch swap
            oneInch.swap(IERC20(slot.asset), IERC20(slot.positionAsset), slot.balance, 1, distribution, 0);
            // if no aave allowance, approve
            if (IERC20(slot.positionAsset).allowance(address(this), address(pool)) < slot.balance) {
                IERC20(slot.positionAsset).approve(address(pool), uint256(-1));
            }
            // deposit collateral to aave on behalf of user
            slot.wethBalance = IERC20(slot.positionAsset).balanceOf(address(this));
            pool.deposit(slot.positionAsset, slot.wethBalance, slot.sender, 0);
            pool.borrow(slot.asset, slot.amount.add(premiums[0]), 2, 0, slot.sender);
        }

        // close long position
        if (slot.operation == 1) {
            // if no aave allowance, approve
            if (IERC20(slot.asset).allowance(address(this), address(pool)) < slot.amount) {
                IERC20(slot.asset).approve(address(pool), uint256(-1));
            }
            // first repaid the debt of the user using the flashloan funds
            pool.repay(slot.asset, slot.amount, 2, slot.sender);
            // transfer atoken from user to contract
            IERC20(slot.apositionAsset).transferFrom(slot.sender, address(this), slot.collateralAmount);
            // transform atoken in token
            pool.withdraw(slot.positionAsset, slot.collateralAmount, address(this));
            // get 1inch v1 distribution
            (uint256 returnAmount, uint256[] memory distribution) =
                oneInch.getExpectedReturn(IERC20(slot.positionAsset), IERC20(slot.asset), slot.collateralAmount, 10, 0);
            // if no 1inch allowance, approve
            if (IERC20(slot.positionAsset).allowance(address(this), address(oneInch)) < slot.collateralAmount) {
                IERC20(slot.positionAsset).approve(address(oneInch), uint256(-1));
            }
            // 1inch swap
            oneInch.swap(IERC20(slot.positionAsset), IERC20(slot.asset), slot.collateralAmount, 1, distribution, 0);
            // send collateral back to user
            slot.balance = IERC20(slot.asset).balanceOf(address(this));
            IERC20(slot.asset).transfer(slot.sender, slot.balance - slot.amount.add(premiums[0]));
        }

        // open short position
        if (slot.operation == 2) {
            // transfer collateral from user to contract
            IERC20(slot.collateralAsset).transferFrom(slot.sender, address(this), slot.collateralAmount);
            // get 1inch v1 distribution
            (uint256 returnAmount, uint256[] memory distribution) =
                oneInch.getExpectedReturn(IERC20(slot.asset), IERC20(slot.collateralAsset), slot.amount, 10, 0);
            // if no 1inch allowance, approve
            if (IERC20(slot.asset).allowance(address(this), address(oneInch)) < slot.amount) {
                IERC20(slot.asset).approve(address(oneInch), uint256(-1));
            }
            // 1inch swap
            oneInch.swap(IERC20(slot.asset), IERC20(slot.collateralAsset), slot.amount, 1, distribution, 0);
            // update collateral balance
            slot.balance = IERC20(slot.collateralAsset).balanceOf(address(this));
            // if no aave allowance, approve
            if (IERC20(slot.collateralAsset).allowance(address(this), address(pool)) < slot.balance) {
                IERC20(slot.collateralAsset).approve(address(pool), uint256(-1));
            }
            // deposit collateral to aave on behalf of user
            pool.deposit(slot.collateralAsset, slot.balance, slot.sender, 0);
            // borrow loaned asset on behalf of user
            pool.borrow(slot.asset, slot.amount.add(premiums[0]), 2, 0, slot.sender);
            // transfer loan to pay back from user to contract
            IERC20(slot.asset).transferFrom(slot.sender, address(this), slot.amount.add(premiums[0]));
        }

        // necessary to repay the loan
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 amountOwing = amounts[i].add(premiums[i]);
            IERC20(assets[i]).approve(address(LENDING_POOL), amountOwing);
        }

        return true;
    }

    function myFlashLoanCall(
        address loanAsset,
        address positionAsset,
        address apositionAsset,
        uint256 amount,
        uint256 operation,
        address collateralAsset,
        uint256 collateralAmount
    ) public {
        address receiverAddress = address(this);

        address[] memory assets = new address[](1);
        assets[0] = loanAsset;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount + 10000;

        // 0 = no debt, 1 = stable, 2 = variable
        uint256[] memory modes = new uint256[](1);
        modes[0] = 0;

        address onBehalfOf = address(this);
        bytes memory params =
            abi.encode(msg.sender, positionAsset, apositionAsset, collateralAsset, operation, collateralAmount);
        uint16 referralCode = 0;

        LENDING_POOL.flashLoan(receiverAddress, assets, amounts, modes, onBehalfOf, params, referralCode);
    }
}
