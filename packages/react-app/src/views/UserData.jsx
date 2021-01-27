import React, { memo, useState, useEffect } from "react";
import { useBlockNumber, usePoller } from "eth-hooks";
import { AAVELendingPoolAddressProviderAbi as IAddressProvider } from "../abis/AAVELendingPoolAddressProvider.js";
import { abi as IDataProvider } from "../abis/ProtocolDataProvider.json";
import { abi as ILendingPool } from "../abis/LendingPool.json";
// import { abi as IPriceOracle } from "../abis/PriceOracle.json";
import { abi as IErc20 } from "../abis/erc20.json";
import { ethers } from "ethers";
import { Table } from "reactstrap";

function UserData(props) {
  const [userConfiguration, setUserConfiguration] = useState();
  const [activeTokenData, setActiveTokenData] = useState();
  const [reserveTokensForConfig, updateReserveTokensForConfig] = useState();
  const [userAccountData, setUserAccountData] = useState();
  const [userAssetData, setUserAssetData] = useState();
  const [userAssetList, setUserAssetList] = useState([]);
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
    // (async function () {
    getReserveTokens();
    // await getReserveTokens();
    // })();
  }, []);

  useEffect(() => {
    (async function () {
      // await getReserveData();
      await getUserInfo();
      // await getUserAssetData();
    })();
  }, [reserveTokens]);

  // useEffect(() => {
  //   getUserConfiguration();
  // }, [userAccountData]);

  // useEffect(() => {
  //   checkUserConfiguration();
  // }, [userConfiguration]);

  useEffect(() => {
    getDataForAllActiveTokens();
  }, [userAssetList]);

  const getDebtDetails = async asset => {
    let stableContract = new ethers.Contract(asset.stableDebtTokenAddress, IErc20, signer);
    let variableContract = new ethers.Contract(asset.variableDebtTokenAddress, IErc20, signer);
    let stableDebt = await stableContract.balanceOf(signer.getAddress());
    let variableDebt = await variableContract.balanceOf(signer.getAddress());
    return {
      stable: stableDebt,
      variable: variableDebt,
    };
  };

  const getATokenDetails = async asset => {
    let ATokenContract = new ethers.Contract(asset.aTokenAddress, IErc20, signer);
    let aTokenData = await ATokenContract.balanceOf(signer.getAddress());
    return {
      aToken: aTokenData,
    };
  };
  const getDataForAllActiveTokens = async () => {
    let _activeTokenData = [];
    if (userAssetList.length === 0) return;
    for (const asset of userAssetList) {
      // }
      // userAssetList.forEach(async asset => {
      let assetData = reserveTokens.filter(function (el) {
        return el.symbol === asset.symbol;
      })[0];
      if (assetData) {
        let _data = {
          stable: undefined,
          variable: undefined,
          aToken: undefined,
        };
        if (asset.type === "debt") {
          let data = await getDebtDetails(assetData);
          _data = { ..._data, ...data };
        } else {
          let data = await getATokenDetails(assetData);
          _data = { ..._data, ...data };
        }
        let dataObject = {
          symbol: assetData.symbol,
          stable: _data.stable || 0,
          variable: _data.variable || 0,
          aToken: _data.aToken || 0,
        };
        _activeTokenData.push(dataObject);
      }
      // });
    }
    setActiveTokenData(_activeTokenData);
  };

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
      let _reserveTokensWithExtraInfo = [];
      let _reserveTokens = await dataProviderContract.getAllReservesTokens(); //.getReserveData("0x6B175474E89094C44Da98b954EedeAC495271d0F")//makeCall('getAddress', addressProviderContract, ["0x1"])
      // console.log(_reserveTokens);
      updateReserveTokensForConfig(_reserveTokens);
      for (const token of _reserveTokens) {
        let tokenAddressData = await dataProviderContract.getReserveTokensAddresses(token.tokenAddress);
        let tokenWithAddresses = {
          ...token,
          ...tokenAddressData,
        };
        _reserveTokensWithExtraInfo.push(tokenWithAddresses);
      }
      // _reserveTokens.forEach(async token => {
      //   let tokenAddressData = await dataProviderContract.getReserveTokensAddresses(token.tokenAddress);
      //   let tokenWithAddresses = {
      //     ...token,
      //     ...tokenAddressData,
      //   };
      //   _reserveTokensWithExtraInfo.push(tokenWithAddresses);
      // });
      setReserveTokens(_reserveTokensWithExtraInfo);
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
      console.log(_data);
      setUserAssetData(_data);
    }
  };

  const getUserInfo = async () => {
    console.log("getting user info");
    let address = await signer.getAddress();
    let _accountData = await lendingPoolContract.getUserAccountData(address);
    setUserAccountData(_accountData);
    let _userConfiguration = await lendingPoolContract.getUserConfiguration(address);
    checkUserConfiguration(_userConfiguration);
    setUserConfiguration(_userConfiguration);
  };

  const checkUserConfiguration = async configuration => {
    if (
      configuration &&
      reserveTokensForConfig &&
      reserveTokens &&
      reserveTokens.length === reserveTokensForConfig.length
    ) {
      let _userActiveAssets = {};
      let configBits = parseInt(configuration.toString(), 10).toString(2);
      let reversedBits = configBits.split("").reverse();
      let _userAssetList = [];
      for (let i = 0; i < reversedBits.length; i++) {
        let _assetIndex = Math.floor(i / 2);
        if (reversedBits[i] === "1") {
          let _type = i % 2 === 0 ? "debt" : "collateral";
          let _symbol = reserveTokensForConfig[_assetIndex]["symbol"];
          // let _newAsset;
          // if (_userAssetList[_symbol]) {
          //   _newAsset = [..._userAssetList[_symbol], _type];
          // } else {
          // _newAsset = [_type];
          // }
          _userAssetList.push({ symbol: _symbol, type: _type });
        }
      }
      console.log(_userAssetList);
      setUserAssetList(_userAssetList);
    }
  };

  // usePoller(getTokenBalance, 3000);
  // usePoller(getReserveTokens, 3000);
  // usePoller(getReserveData, 15000);
  // usePoller(getUserAssetData, 6000);
  // usePoller(getUserInfo, 6000);
  // if (activeTokenData && Object.keys(activeTokenData.length) > 0) {
  //  debugger;
  return (
    <>
      {activeTokenData ? (
        <div className="posiions">
          <Table dark>
            <thead>
              <tr>
                <th>#</th>
                <th>Symbol</th>
                <th>Variable Debt</th>
                <th>Stable Debt</th>
                <th>ATokens</th>
              </tr>
            </thead>
            <tbody>
              {activeTokenData.map((tokenData, index) => {
                return (
                  <tr>
                    <th scope="row">{index + 1}</th>
                    <td>{tokenData.symbol}</td>
                    <td>{tokenData.variable ? ethers.utils.formatEther(tokenData.variable.toString()) : 0}</td>
                    <td>{tokenData.stable ? ethers.utils.formatEther(tokenData.stable.toString()) : 0}</td>
                    <td>{tokenData.aToken ? ethers.utils.formatEther(tokenData.aToken.toString()) : 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      ) : (
        " User has no transactions"
      )}
    </>
  );
  // }
}

export default memo(UserData);
