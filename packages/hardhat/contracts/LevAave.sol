pragma solidity 0.6.12;

import { FlashLoanReceiverBase } from "./utils/FlashLoanReceiverBase.sol";
import { ILendingPool } from "./interfaces/ILendingPool.sol";
import { ILendingPoolAddressesProvider } from "./interfaces/ILendingPoolAddressesProvider.sol";
import { IERC20 } from "./interfaces/IERC20.sol";

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
        slot.balance = IERC20(assets[0]).balanceOf(address(this));
        (slot.sender, slot.positionAsset, slot.apositionAsset) = abi.decode(params, (address, address, address));

        // get 1inch v1 distribution
        (uint256 returnAmount, uint256[] memory distribution) =
            oneInch.getExpectedReturn(IERC20(assets[0]), IERC20(slot.positionAsset), slot.balance, 10, 0);
        // if no 1inch allowance, approve
        if (IERC20(assets[0]).allowance(address(this), address(oneInch)) < slot.balance) {
            IERC20(assets[0]).approve(address(oneInch), uint256(-1));
        }
        // 1inch swap
        oneInch.swap(IERC20(assets[0]), IERC20(slot.positionAsset), slot.balance, 1, distribution, 0);
        // if no aave allowance, approve
        if (IERC20(slot.positionAsset).allowance(address(this), address(pool)) < slot.balance) {
            IERC20(slot.positionAsset).approve(address(pool), uint256(-1));
        }
        // deposit collateral to aave on behalf of user
        slot.wethBalance = IERC20(slot.positionAsset).balanceOf(address(this));
        pool.deposit(slot.positionAsset, slot.wethBalance, slot.sender, 0);
        pool.borrow(assets[0], slot.amount.add(premiums[0]), 2, 0, slot.sender);

        // necessary to repay the loan
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 amountOwing = amounts[i].add(premiums[i]);
            IERC20(assets[i]).approve(address(LENDING_POOL), amountOwing);
        }

        return true;
    }

    function myFlashLoanCall(
        address collateralAsset,
        address positionAsset,
        address apositionAsset,
        uint256 amount
    ) public {
        IERC20(collateralAsset).transferFrom(msg.sender, address(this), amount.div(2));
        address receiverAddress = address(this);

        address[] memory assets = new address[](1);
        assets[0] = collateralAsset;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;

        // 0 = no debt, 1 = stable, 2 = variable
        uint256[] memory modes = new uint256[](1);
        modes[0] = 0;

        address onBehalfOf = address(this);
        bytes memory params = abi.encode(msg.sender, positionAsset, apositionAsset);
        uint16 referralCode = 0;

        LENDING_POOL.flashLoan(receiverAddress, assets, amounts, modes, onBehalfOf, params, referralCode);
    }
    receive() external payable {}
}
