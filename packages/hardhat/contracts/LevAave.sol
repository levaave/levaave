//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.12;

import "hardhat/console.sol";

import { FlashLoanReceiverBase } from "./utils/FlashLoanReceiverBase.sol";
import { ILendingPool } from "./interfaces/ILendingPool.sol";
import { ILendingPoolAddressesProvider } from "./interfaces/ILendingPoolAddressesProvider.sol";
import { IERC20 } from "./interfaces/IERC20.sol";

contract LevAave is FlashLoanReceiverBase {
    address oneInch = address(0x111111125434b319222CdBf8C261674aDB56F3ae);

    constructor(ILendingPoolAddressesProvider _addressProvider) public FlashLoanReceiverBase(_addressProvider) {}

    mapping(address => Position[]) public positions;
    mapping(address => uint256) public positionsOpen;

    event TransactionSuccess(
        address userAddress,
        uint8 leverageType,
        uint8 leverageMultiplier,
        address collateralTokenAddress,
        uint256 collateralAmount,
        address leverageTokenAddress,
        uint256 leverageAmount
    );

    struct Position {
        uint256 id;
        uint8 direction; // 0 long 1 shor
        address collateral;
        address leveragedAsset;
        uint256 collateralAmount;
        uint256 leveragedAmount;
    }

    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        //open long position
        uint256 operation = abi.decode(params, (uint256));
        if (operation == 0) {
            _executeLongLeverage(assets[0], amounts[0], premiums[0], params);
        } else if (operation == 1) {
            _executeCloseLong(assets[0], amounts[0], premiums[0], params);
        } else if (operation == 2) {
            _executeShortLeverage(assets[0], amounts[0], premiums[0], params);
        } else if (operation == 2) {
            _executeShortLeverage(assets[0], amounts[0], premiums[0], params);
        } else if (operation == 3) {
            _executeCloseShort(assets[0], amounts[0], premiums[0], params);
        }

        // necessary to repay the loan
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 amountOwing = amounts[i].add(premiums[i]);
            IERC20(assets[i]).approve(address(LENDING_POOL), amountOwing);
        }

        return true;
    }

    function positionsLength(address sender) external view returns (uint256) {
        return positions[sender].length;
    }

    function longLeverage(
        address loanAsset,
        address positionAsset,
        uint256 amount,
        uint8 leverage,
        bytes calldata oneInchData
    ) public {
        address receiverAddress = address(this);

        address[] memory assets = new address[](1);
        assets[0] = loanAsset;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;

        // 0 = no debt, 1 = stable, 2 = variable
        uint256[] memory modes = new uint256[](1);
        modes[0] = 0;

        address onBehalfOf = address(this);
        bytes memory params = abi.encode(0, msg.sender, positionAsset, leverage, oneInchData);
        uint16 referralCode = 0;

        LENDING_POOL.flashLoan(receiverAddress, assets, amounts, modes, onBehalfOf, params, referralCode);
    }

    function _executeLongLeverage(
        address asset,
        uint256 amount,
        uint256 premium,
        bytes memory params
    ) private {
        (uint256 operation, address sender, address positionAsset, uint8 leverage, bytes memory oneInchData) =
            abi.decode(params, (uint256, address, address, uint8, bytes));
        // transfer collateral from user to contract

        IERC20(asset).transferFrom(sender, address(this), amount.div(leverage));
        // update collateral balance

        uint256 balance = IERC20(asset).balanceOf(address(this));
        {
            // approve for 1inch
            if (IERC20(asset).allowance(address(this), address(oneInch)) < balance) {
                IERC20(asset).approve(address(oneInch), uint256(-1));
            }

            // 1inch trade
            oneInch.call(oneInchData);
            // update balance
            balance = IERC20(positionAsset).balanceOf(address(this));
        }
        {
            // if no aave allowance, approve
            if (IERC20(positionAsset).allowance(address(this), address(LENDING_POOL)) < balance) {
                IERC20(positionAsset).approve(address(LENDING_POOL), uint256(-1));
            }
        }
        {
            // deposit collateral to aave on behalf of user
            operation = IERC20(positionAsset).balanceOf(address(this)); // reusing variable for balance
            LENDING_POOL.deposit(positionAsset, operation, sender, 0);
            LENDING_POOL.borrow(asset, amount.add(premium), 2, 0, sender);
        }
        {
            // save position info in storage
            Position memory newPosition = Position(positions[sender].length, 0, asset, positionAsset, amount, balance);
            positions[sender].push(newPosition);
            positionsOpen[sender]++;
        }
        emit TransactionSuccess(sender, 0, leverage, asset, amount, positionAsset, balance);
    }

    function closeLong(
        address loanAsset,
        address positionAsset,
        address apositionAsset,
        address debtToken,
        uint256 amount,
        uint256 collateralAmount,
        uint16 id,
        bytes calldata oneInchData
    ) public {
        address receiverAddress = address(this);

        address[] memory assets = new address[](1);
        assets[0] = loanAsset;

        uint256[] memory amounts = new uint256[](1);
        if (positionsOpen[msg.sender] == 1) {
            uint256 debt = IERC20(debtToken).balanceOf(msg.sender);
            amounts[0] = debt;
        } else {
            amounts[0] = amount;
        }
        // 0 = no debt, 1 = stable, 2 = variable
        uint256[] memory modes = new uint256[](1);
        modes[0] = 0;

        address onBehalfOf = address(this);
        bytes memory params =
            abi.encode(1, msg.sender, positionAsset, apositionAsset, collateralAmount, id, oneInchData);
        uint16 referralCode = 0;

        LENDING_POOL.flashLoan(receiverAddress, assets, amounts, modes, onBehalfOf, params, referralCode);
    }

    function _executeCloseLong(
        address asset,
        uint256 amount,
        uint256 premium,
        bytes memory params
    ) private {
        (
            uint256 operation,
            address sender,
            address positionAsset,
            address apositionAsset,
            uint256 collateralAmount,
            uint8 id,
            bytes memory oneInchData
        ) = abi.decode(params, (uint256, address, address, address, uint256, uint8, bytes));
        {
            // if no aave allowance, approve
            if (IERC20(asset).allowance(address(this), address(LENDING_POOL)) < amount) {
                IERC20(asset).approve(address(LENDING_POOL), uint256(-1));
            }
            // first repay the debt of the user using the flashloan funds
            LENDING_POOL.repay(asset, amount, 2, sender);
        }
        {
            // transfer atoken from user to contract
            IERC20(apositionAsset).transferFrom(sender, address(this), collateralAmount);
            // transform atoken in token
            LENDING_POOL.withdraw(positionAsset, collateralAmount, address(this));
        }
        {
            // update balance
            collateralAmount = IERC20(positionAsset).balanceOf(address(this)); // reusing variable for balance
            // approve for 1inch
            if (IERC20(positionAsset).allowance(address(this), address(oneInch)) < collateralAmount) {
                IERC20(positionAsset).approve(address(oneInch), uint256(-1));
            }
            // 1inch trade
            oneInch.call(oneInchData);
            // send collateral back to user
            collateralAmount = IERC20(asset).balanceOf(address(this));
            IERC20(asset).transfer(sender, collateralAmount - amount.add(premium));
        }
        {
            // remove position info from storage
            delete positions[sender][id];
            positionsOpen[sender]--;
        }
        emit TransactionSuccess(sender, 0, 0, asset, amount, positionAsset, collateralAmount);
    }

    function shortLeverage(
        address loanAsset,
        address positionAsset,
        uint256 amount,
        uint256 collateralAmount,
        bytes calldata oneInchData
    ) public {
        address receiverAddress = address(this);

        address[] memory assets = new address[](1);
        assets[0] = loanAsset;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;

        // 0 = no debt, 1 = stable, 2 = variable
        uint256[] memory modes = new uint256[](1);
        modes[0] = 0;

        address onBehalfOf = address(this);
        bytes memory params = abi.encode(2, msg.sender, positionAsset, collateralAmount, oneInchData);
        uint16 referralCode = 0;

        LENDING_POOL.flashLoan(receiverAddress, assets, amounts, modes, onBehalfOf, params, referralCode);
    }

    function _executeShortLeverage(
        address asset,
        uint256 amount,
        uint256 premium,
        bytes memory params
    ) private {
        (uint256 operation, address sender, address positionAsset, uint256 collateralAmount, bytes memory oneInchData) =
            abi.decode(params, (uint256, address, address, uint256, bytes));

        // transfer collateral from user to contract
        IERC20(positionAsset).transferFrom(sender, address(this), collateralAmount);
        // 1inch approve
        if (IERC20(asset).allowance(address(this), address(oneInch)) < amount) {
            IERC20(asset).approve(address(oneInch), uint256(-1));
        }
        // 1inch trade
        oneInch.call(oneInchData);
        // update collateral balance
        operation = IERC20(positionAsset).balanceOf(address(this)); // reuse variable for balance
        // if no aave allowance, approve
        if (IERC20(positionAsset).allowance(address(this), address(LENDING_POOL)) < operation) {
            IERC20(positionAsset).approve(address(LENDING_POOL), uint256(-1));
        }
        // deposit collateral to aave on behalf of user
        LENDING_POOL.deposit(positionAsset, operation, sender, 0);
        // borrow loaned asset on behalf of user
        LENDING_POOL.borrow(asset, amount.add(premium), 2, 0, sender);
        // save position info in storage
        Position memory newPosition = Position(positions[sender].length, 1, positionAsset, asset, amount, operation);
        positions[sender].push(newPosition);
        positionsOpen[sender]++;
        emit TransactionSuccess(sender, 0, 0, asset, amount, positionAsset, collateralAmount);
    }

    function closeShort(
        address loanAsset,
        address positionAsset,
        address apositionAsset,
        address debtToken,
        uint256 amount,
        uint16 id,
        bytes calldata oneInchData
    ) public {
        address receiverAddress = address(this);

        address[] memory assets = new address[](1);
        assets[0] = loanAsset;

        uint256[] memory amounts = new uint256[](1);
        if (positionsOpen[msg.sender] == 1) {
            uint256 debt = IERC20(debtToken).balanceOf(msg.sender);
            amounts[0] = debt;
        } else {
            amounts[0] = amount;
        }
        // 0 = no debt, 1 = stable, 2 = variable
        uint256[] memory modes = new uint256[](1);
        modes[0] = 0;

        address onBehalfOf = address(this);
        bytes memory params = abi.encode(3, msg.sender, positionAsset, apositionAsset, id, oneInchData);
        uint16 referralCode = 0;

        LENDING_POOL.flashLoan(receiverAddress, assets, amounts, modes, onBehalfOf, params, referralCode);
    }

    function _executeCloseShort(
        address asset,
        uint256 amount,
        uint256 premium,
        bytes memory params
    ) private {
        (
            uint256 operation,
            address sender,
            address positionAsset,
            address apositionAsset,
            uint16 id,
            bytes memory oneInchData
        ) = abi.decode(params, (uint256, address, address, address, uint16, bytes));
        // if no aave allowance, approve
        if (IERC20(asset).allowance(address(this), address(LENDING_POOL)) < amount) {
            IERC20(asset).approve(address(LENDING_POOL), uint256(-1));
        }
        // first repay the debt of the user using the flashloan funds
        LENDING_POOL.repay(asset, amount, 2, sender);
        // transfer atoken from user to contract
        operation = IERC20(apositionAsset).balanceOf(sender); // reusing variable
        IERC20(apositionAsset).transferFrom(sender, address(this), operation);
        // transform atoken in token
        LENDING_POOL.withdraw(positionAsset, operation, address(this));
        // update balance
        operation = IERC20(positionAsset).balanceOf(address(this)); // reusing variable
        // approve for 1inch
        if (IERC20(positionAsset).allowance(address(this), address(oneInch)) < operation) {
            IERC20(positionAsset).approve(address(oneInch), uint256(-1));
        }
        // 1inch trade
        oneInch.call(oneInchData);
        // send collateral back to user
        operation = IERC20(asset).balanceOf(address(this)); // reusing variable
        IERC20(asset).transfer(sender, operation - amount.add(premium));
        // remove position info from storage
        delete positions[sender][id];
        positionsOpen[sender]--;
        emit TransactionSuccess(sender, 0, 0, asset, amount, positionAsset, operation);
    }
}
