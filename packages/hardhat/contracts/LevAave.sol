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

    constructor(ILendingPoolAddressesProvider _addressProvider) public FlashLoanReceiverBase(_addressProvider) {}

    mapping(address => Position[]) public positions;

    struct Position {
      uint256 id;
      uint8 direction; // 0 long 1 short
      address collateral;
      address leveragedAsset;
      uint256 collateralAmount;
      uint256 leveragedAmount;
    }

    struct SlotInfo {
        uint256 balance;
        uint256 wethBalance;
        uint256 collateralAmount;
        uint256 amount;
        address sender;
        address positionAsset;
        address apositionAsset;
        address asset;
        bytes oneInchData;
        bool success;
        uint8 leverage;
        uint8 operation;
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
        ) = abi.decode(params, (address, address, address, uint8, uint256, bytes, uint8));
        //open long position
        if (slot.operation == 0) {
            // transfer collateral from user to contract
            IERC20(slot.asset).transferFrom(slot.sender, address(this), slot.amount.div(slot.leverage));
            // update collateral balance
            slot.balance = IERC20(slot.asset).balanceOf(address(this));
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
            if (IERC20(slot.positionAsset).allowance(address(this), address(LENDING_POOL)) < slot.balance) {
                IERC20(slot.positionAsset).approve(address(LENDING_POOL), uint256(-1));
            }
            // deposit collateral to aave on behalf of user
            slot.wethBalance = IERC20(slot.positionAsset).balanceOf(address(this));
            LENDING_POOL.deposit(slot.positionAsset, slot.wethBalance, slot.sender, 0);
            LENDING_POOL.borrow(slot.asset, slot.amount.add(premiums[0]), 2, 0, slot.sender);
            // save position info in storage
            Position memory newPosition = Position(positions[slot.sender].length, 0, slot.asset, slot.positionAsset, slot.amount, slot.balance);
            positions[slot.sender].push(newPosition);
        }

        // close long position
        if (slot.operation == 1) {
            // if no aave allowance, approve
            if (IERC20(slot.asset).allowance(address(this), address(LENDING_POOL)) < slot.amount) {
                IERC20(slot.asset).approve(address(LENDING_POOL), uint256(-1));
            }
            // first repay the debt of the user using the flashloan funds
            LENDING_POOL.repay(slot.asset, slot.amount, 2, slot.sender);
            // transfer atoken from user to contract
            uint256 collateralBalance = IERC20(slot.apositionAsset).balanceOf(slot.sender);
            IERC20(slot.apositionAsset).transferFrom(slot.sender, address(this), collateralBalance);
            // transform atoken in token
            LENDING_POOL.withdraw(slot.positionAsset, collateralBalance, address(this));
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
            // remove position info from storage
            delete positions[slot.sender][slot.leverage];
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
            if (IERC20(slot.positionAsset).allowance(address(this), address(LENDING_POOL)) < slot.balance) {
                IERC20(slot.positionAsset).approve(address(LENDING_POOL), uint256(-1));
            }
            // deposit collateral to aave on behalf of user
            LENDING_POOL.deposit(slot.positionAsset, slot.balance, slot.sender, 0);
            // borrow loaned asset on behalf of user
            LENDING_POOL.borrow(slot.asset, slot.amount.add(premiums[0]), 2, 0, slot.sender);
            // save position info in storage
            Position memory newPosition = Position(positions[slot.sender].length, 1, slot.positionAsset, slot.asset, slot.amount, slot.balance);
            positions[slot.sender].push(newPosition);
        }

        // close short position
        if (slot.operation == 3) {
            // if no aave allowance, approve
            if (IERC20(slot.asset).allowance(address(this), address(LENDING_POOL)) < slot.amount) {
                IERC20(slot.asset).approve(address(LENDING_POOL), uint256(-1));
            }
            // first repay the debt of the user using the flashloan funds
            LENDING_POOL.repay(slot.asset, slot.amount, 2, slot.sender);
            // transfer atoken from user to contract
            uint256 collateralBalance = IERC20(slot.apositionAsset).balanceOf(slot.sender);
            IERC20(slot.apositionAsset).transferFrom(slot.sender, address(this), collateralBalance);
            // transform atoken in token
            LENDING_POOL.withdraw(slot.positionAsset, collateralBalance, address(this));
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
            // remove position info from storage
            delete positions[slot.sender][slot.leverage];
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
        uint8 operation,
        uint256 collateralAmount,
        bytes calldata oneInchData,
        uint8 leverage
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

    function positionsLength(address sender) external view returns(uint256) {
      return positions[sender].length;
    }
}
