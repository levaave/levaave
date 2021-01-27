pragma solidity 0.6.12;

import "hardhat/console.sol";

import {FlashLoanReceiverBase} from "./utils/FlashLoanReceiverBase.sol";
import {ILendingPool} from "./interfaces/ILendingPool.sol";
import {
    ILendingPoolAddressesProvider
} from "./interfaces/ILendingPoolAddressesProvider.sol";
import {IERC20} from "./interfaces/IERC20.sol";

contract LevAave is FlashLoanReceiverBase {
    address oneInch = address(0x111111125434b319222CdBf8C261674aDB56F3ae);
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
        uint256 collateralAmount;
        bool success;
        bytes oneInchData;
        uint256 leverage;
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
            slot.operation,
            slot.collateralAmount,
            slot.oneInchData,
            slot.leverage
        ) = abi.decode(params, (address, address, address, uint256, uint256, bytes, uint256));
        //open long position
        if (slot.operation == 0) {
            // transfer collateral from user to contract
            IERC20(slot.asset).transferFrom(slot.sender, address(this), slot.amount.div(slot.leverage));
            // update collateral balance
            slot.balance = IERC20(slot.asset).balanceOf(address(this));
            console.log("collateralBalance", slot.balance);
            // approve for 1inch
            if (IERC20(slot.asset).allowance(address(this), address(oneInch)) < slot.balance) {
                IERC20(slot.asset).approve(address(oneInch), uint256(-1));
            }
            // 1inch trade
            (slot.success, ) = oneInch.call(slot.oneInchData);
            require(slot.success, "1inch call failed");
            // update balance
            slot.balance = IERC20(slot.positionAsset).balanceOf(address(this));
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
            // first repay the debt of the user using the flashloan funds
            pool.repay(slot.asset, slot.amount, 2, slot.sender);
            // transfer atoken from user to contract
            uint256 collateralBalance = IERC20(slot.apositionAsset).balanceOf(slot.sender);
            IERC20(slot.apositionAsset).transferFrom(slot.sender, address(this), collateralBalance);
            // transform atoken in token
            pool.withdraw(slot.positionAsset, collateralBalance, address(this));
            // update balance
            slot.balance = IERC20(slot.positionAsset).balanceOf(address(this));
            // approve for 1inch
            if (IERC20(slot.positionAsset).allowance(address(this), address(oneInch)) < slot.balance) {
                IERC20(slot.positionAsset).approve(address(oneInch), uint256(-1));
            }
            // 1inch trade
            (slot.success, ) = oneInch.call(slot.oneInchData);
            require(slot.success, "1inch call failed");
            // send collateral back to user
            slot.balance = IERC20(slot.asset).balanceOf(address(this));
            IERC20(slot.asset).transfer(slot.sender, slot.balance - slot.amount.add(premiums[0]));
        }

        // open short position
        if (slot.operation == 2) {
            // transfer collateral from user to contract
            IERC20(slot.positionAsset).transferFrom(slot.sender, address(this), slot.collateralAmount);
            // 1inch approve
            if (IERC20(slot.asset).allowance(address(this), address(oneInch)) < slot.amount) {
                IERC20(slot.asset).approve(address(oneInch), uint256(-1));
            }
            // 1inch trade
            (slot.success, ) = oneInch.call(slot.oneInchData);
            require(slot.success, "1inch call failed");
            // update collateral balance
            slot.balance = IERC20(slot.positionAsset).balanceOf(address(this));
            // if no aave allowance, approve
            if (IERC20(slot.positionAsset).allowance(address(this), address(pool)) < slot.balance) {
                IERC20(slot.positionAsset).approve(address(pool), uint256(-1));
            }
            // deposit collateral to aave on behalf of user
            pool.deposit(slot.positionAsset, slot.balance, slot.sender, 0);
            // borrow loaned asset on behalf of user
            pool.borrow(slot.asset, slot.amount.add(premiums[0]), 2, 0, slot.sender);
        }

        // close short position
        if (slot.operation == 3) {
            // if no aave allowance, approve
            if (IERC20(slot.asset).allowance(address(this), address(pool)) < slot.amount) {
                IERC20(slot.asset).approve(address(pool), uint256(-1));
            }
            // first repay the debt of the user using the flashloan funds
            pool.repay(slot.asset, slot.amount, 2, slot.sender);
            // transfer atoken from user to contract
            uint256 collateralBalance = IERC20(slot.apositionAsset).balanceOf(slot.sender);
            IERC20(slot.apositionAsset).transferFrom(slot.sender, address(this), collateralBalance);
            // transform atoken in token
            pool.withdraw(slot.positionAsset, collateralBalance, address(this));
            // update balance
            slot.balance = IERC20(slot.positionAsset).balanceOf(address(this));
            // approve for 1inch
            if (IERC20(slot.positionAsset).allowance(address(this), address(oneInch)) < slot.balance) {
                IERC20(slot.positionAsset).approve(address(oneInch), uint256(-1));
            }
            // 1inch trade
            (slot.success, ) = oneInch.call(slot.oneInchData);
            require(slot.success, "1inch call failed");
            // send collateral back to user
            slot.balance = IERC20(slot.asset).balanceOf(address(this));
            IERC20(slot.asset).transfer(slot.sender, slot.balance - slot.amount.add(premiums[0]));
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
        address debtAsset,
        uint256 amount,
        uint256 operation,
        uint256 collateralAmount,
        bytes calldata oneInchData,
        uint256 leverage
    ) public {
        address[] memory assets = new address[](1);
        assets[0] = loanAsset;

        uint256[] memory amounts = new uint256[](1);
        if (operation == 0 || operation == 2) {
            amounts[0] = amount;
        }
        if (operation == 1 || operation == 3) {
            uint256 debt = IERC20(debtAsset).balanceOf(msg.sender);
            amounts[0] = debt;
        }

        // 0 = no debt, 1 = stable, 2 = variable
        uint256[] memory modes = new uint256[](1);
        modes[0] = 0;

        address onBehalfOf = address(this);
        bytes memory params =
            abi.encode(msg.sender, positionAsset, apositionAsset, operation, collateralAmount, oneInchData, leverage);
        uint16 referralCode = 0;

        LENDING_POOL.flashLoan(address(this), assets, amounts, modes, onBehalfOf, params, referralCode);
    }
}
