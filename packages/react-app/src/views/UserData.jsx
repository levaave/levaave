import React, { memo, useState, useEffect } from "react";
import { useBlockNumber, usePoller } from "eth-hooks";
import { AAVELendingPoolAddressProviderAbi as IAddressProvider } from "../abis/AAVELendingPoolAddressProvider.js";
import { abi as IDataProvider } from "../abis/ProtocolDataProvider.json";
import { abi as ILendingPool } from "../abis/LendingPool.json";
// import { abi as IPriceOracle } from "../abis/PriceOracle.json";
import { abi as IErc20 } from "../abis/erc20.json";
import { ethers } from "ethers";

function UserData(props) {
  const [userConfiguration, setUserConfiguration] = useState();
  const [userAccountData, setUserAccountData] = useState();
  const [userAssetData, setUserAssetData] = useState();
  const [userAssetList, setUserAssetList] = useState({});
  const [balance, setBalance] = useState();
  const [poolAllowance, setPoolAllowance] = useState();

  const [reserveTokens, setReserveTokens] = useState();
  const [assetData, setAssetData] = useState({});
  const [assetPrices, setAssetPrices] = useState({});

  const POOL_ADDRESSES_PROVIDER_ADDRESS = "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5";
  const PROTOCOL_DATA_PROVIDER = "0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d";
  const LENDING_POOL = "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9";
  const { signer, liveAsset } = props;

  let addressProviderContract = new ethers.Contract(POOL_ADDRESSES_PROVIDER_ADDRESS, IAddressProvider, signer);
  let dataProviderContract = new ethers.Contract(PROTOCOL_DATA_PROVIDER, IDataProvider, signer);
  let lendingPoolContract = new ethers.Contract(LENDING_POOL, ILendingPool, signer);
  // let priceOracleContract = new ethers.Contract(PRICE_ORACLE, IPriceOracle, signer);

  useEffect(() => {
    (async function () {
      await getReserveTokens();
    })();
  }, []);

  useEffect(() => {
    (async function () {
      await getReserveData();
      await getUserInfo();
      await getUserAssetData();
    })();
  }, [reserveTokens]);
  useEffect(() => {
    checkUserConfiguration();
  }, [userConfiguration]);

  const getTokenBalance = async () => {
    if (assetData && assetData.tokenAddress && signer) {
      let tokenContract = new ethers.Contract(assetData.tokenAddress, IErc20, signer);
      let address = await signer.getAddress();
      console.log(assetData, address);
      let _balance = await tokenContract.balanceOf(address);
      setBalance(_balance);
      let _allowance = await tokenContract.allowance(address, lendingPoolContract.address);
      setPoolAllowance(_allowance);
    }
  };

  const getReserveTokens = async () => {
    // debugger;
    if (!reserveTokens && dataProviderContract) {
      // console.log("getting Reserve Tokens");
      let _reserveTokens = await dataProviderContract.getAllReservesTokens(); //.getReserveData("0x6B175474E89094C44Da98b954EedeAC495271d0F")//makeCall('getAddress', addressProviderContract, ["0x1"])
      // console.log(_reserveTokens);
      setReserveTokens(_reserveTokens);
    }
  };

  const getReserveData = async () => {
    if (reserveTokens && liveAsset) {
      console.log("getting reserve data");

      let asset = reserveTokens.filter(function (el) {
        return el.symbol === liveAsset.label;
      })[0];

      let _reserveData = await dataProviderContract.getReserveData(asset.tokenAddress);
      let _reserveConfigurationData = await dataProviderContract.getReserveConfigurationData(asset.tokenAddress);
      let _newAssetData = { ...asset, ..._reserveData, ..._reserveConfigurationData };
      // debugger;
      setAssetData(_newAssetData);
    }
  };

  const getUserAssetData = async () => {
    if (signer && reserveTokens && liveAsset) {
      let address = await signer.getAddress();

      let asset = reserveTokens.filter(function (el) {
        return el.symbol === liveAsset.label;
      })[0];
      let _data = await dataProviderContract.getUserReserveData(asset.tokenAddress, address);
      // debugger;
      setUserAssetData(_data);
    }
  };

  const getUserInfo = async () => {
    console.log("getting user info");
    let address = await signer.getAddress();
    let _accountData = await lendingPoolContract.getUserAccountData(address);
    setUserAccountData(_accountData);
    let _userConfiguration = await lendingPoolContract.getUserConfiguration(address);
    setUserConfiguration(_userConfiguration);
  };

  const checkUserConfiguration = async _configuration => {
    if (_configuration && reserveTokens) {
      let _userActiveAssets = {};
      let configBits = parseInt(userConfiguration.toString(), 10).toString(2);
      let reversedBits = configBits.split("").reverse();
      let _userAssetList = {};
      for (let i = 0; i < reversedBits.length; i++) {
        let _assetIndex = Math.floor(i / 2);
        if (reversedBits[i] === "1") {
          let _type = i % 2 === 0 ? "debt" : "collateral";
          let _symbol = reserveTokens[_assetIndex]["symbol"];
          let _newAsset;
          if (_userAssetList[_symbol]) {
            _newAsset = [..._userAssetList[_symbol], _type];
          } else {
            _newAsset = [_type];
          }
          _userAssetList[_symbol] = _newAsset;
        }
      }
      // debugger;
      setUserAssetList(_userAssetList);
    }
  };

  usePoller(getTokenBalance, 3000);
  // usePoller(getReserveTokens, 3000);
  // usePoller(getReserveData, 15000);
  // usePoller(getUserAssetData, 6000);
  // usePoller(getUserInfo, 6000);
}

export default memo(UserData);
