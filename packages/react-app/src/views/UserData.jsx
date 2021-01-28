import React, { memo, useState, useEffect, useRef } from "react";
import { useBlockNumber, usePoller } from "eth-hooks";
import { AAVELendingPoolAddressProviderAbi as IAddressProvider } from "../abis/AAVELendingPoolAddressProvider.js";
import { Popover, PopoverBody, PopoverHeader, Button, Input } from "reactstrap";
import { ethers } from "ethers";
import { Table } from "reactstrap";
import { tokenDataJson } from "../helpers/abiHelpers";
import "./NewUI.styles.scss";

import { abi as IDataProvider } from "../abis/ProtocolDataProvider.json";
import { abi as ILendingPool } from "../abis/LendingPool.json";
// import { abi as IPriceOracle } from "../abis/PriceOracle.json";
import { abi as IErc20 } from "../abis/erc20.json";
import clsx from "clsx";

function UserData(props) {
  const [userConfiguration, setUserConfiguration] = useState();
  const [activeTokenData, setActiveTokenData] = useState();
  const [reserveTokensForConfig, updateReserveTokensForConfig] = useState();
  const [userAccountData, setUserAccountData] = useState();
  const [userAssetData, setUserAssetData] = useState();
  const [userAssetList, setUserAssetList] = useState([]);
  const [balance, setBalance] = useState();
  const [poolAllowance, setPoolAllowance] = useState();
  const [clickedButtonId, updateClickedButtonId] = useState(0);
  const [isClosingPosition, updateIsClosingPosition] = useState(false);

  const [reserveTokens, setReserveTokens] = useState();
  const [assetData, setAssetData] = useState({});
  const [assetPrices, setAssetPrices] = useState({});

  const POOL_ADDRESSES_PROVIDER_ADDRESS = "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5";
  const PROTOCOL_DATA_PROVIDER = "0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d";
  const LENDING_POOL = "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9";
  const { signer, liveAsset } = props;

  const [isSelectingCollateralCurrency, updateIsSelectingCollateralCurrency] = useState(false);
  const [isSelectingLeverageCurrency, updateIsSelectingLeverageCurrency] = useState(false);
  const [selectedCollateralCurrencyType, updateSelectedCollateralCurrencyType] = useState({
    label: "WETH",
    value: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  });
  const [selectedLeverageCurrencyType, updateSelectedLeverageCurrencyType] = useState({
    label: "LINK",
    value: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
  });

  const dropdownListLevergae = [
    { label: "USDT", value: "0xdAC17F958D2ee523a2206206994597C13D831ec7" },
    { label: "WBTC", value: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599" },
    { label: "WETH", value: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" },
    { label: "YFI", value: "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e" },
    { label: "ZRX", value: "0xE41d2489571d322189246DaFA5ebDe1F4699F498" },
    { label: "UNI", value: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984" },
    { label: "BAT", value: "0x0D8775F648430679A709E98d2b0Cb6250d2887EF" },
    { label: "BUSD", value: "0x4Fabb145d64652a948d72533023f6E7A623C7C53" },
    { label: "DAI", value: "0x6B175474E89094C44Da98b954EedeAC495271d0F" },
    { label: "ENJ", value: "0xF629cBd94d3791C9250152BD8dfBDF380E2a3B9c" },
    { label: "KNC", value: "0xdd974D5C2e2928deA5F71b9825b8b646686BD200" },
    { label: "LINK", value: "0x514910771AF9Ca656af840dff83E8264EcF986CA" },
    { label: "MANA", value: "0x0F5D2fB29fb7d3CFeE444a200298f468908cC942" },
    { label: "MKR", value: "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2" },
    { label: "REN", value: "0x408e41876cCCDC0F92210600ef50372656052a38" },
    { label: "SNX", value: "0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F" },
    { label: "sUSD", value: "0x57Ab1ec28D129707052df4dF418D58a2D46d5f51" },
    { label: "TUSD", value: "0x0000000000085d4780B73119b644AE5ecd22b376" },
    { label: "USDC", value: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
    { label: "CRV", value: "0xD533a949740bb3306d119CC777fa900bA034cd52" },
    { label: "GUSD", value: "0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd" },
  ];
  const dropdownListCollateral = [
    { label: "Select currency type", value: "" },
    { label: "WBTC", value: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599" },
    { label: "WETH", value: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" },
    { label: "YFI", value: "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e" },
    { label: "ZRX", value: "0xE41d2489571d322189246DaFA5ebDe1F4699F498" },
    { label: "UNI", value: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984" },
    { label: "AAVE", value: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9" },
    { label: "BAT", value: "0x0D8775F648430679A709E98d2b0Cb6250d2887EF" },
    { label: "DAI", value: "0x6B175474E89094C44Da98b954EedeAC495271d0F" },
    { label: "ENJ", value: "0xF629cBd94d3791C9250152BD8dfBDF380E2a3B9c" },
    { label: "KNC", value: "0xdd974D5C2e2928deA5F71b9825b8b646686BD200" },
    { label: "LINK", value: "0x514910771AF9Ca656af840dff83E8264EcF986CA" },
    { label: "MANA", value: "0x0F5D2fB29fb7d3CFeE444a200298f468908cC942" },
    { label: "MKR", value: "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2" },
    { label: "REN", value: "0x408e41876cCCDC0F92210600ef50372656052a38" },
    { label: "SNX", value: "0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F" },
    { label: "TUSD", value: "0x0000000000085d4780B73119b644AE5ecd22b376" },
    { label: "USDC", value: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
    { label: "CRV", value: "0xD533a949740bb3306d119CC777fa900bA034cd52" },
  ];

  const [tokenOptionsForLeveraging, updateTokenOptionsForLeveraging] = useState(dropdownListLevergae);
  const [tokenOptionsForCollateral, updateTokenOptionsForCollateral] = useState(dropdownListCollateral);

  let addressProviderContract = new ethers.Contract(POOL_ADDRESSES_PROVIDER_ADDRESS, IAddressProvider, signer);
  let dataProviderContract = new ethers.Contract(PROTOCOL_DATA_PROVIDER, IDataProvider, signer);
  let lendingPoolContract = new ethers.Contract(LENDING_POOL, ILendingPool, signer);
  // let priceOracleContract = new ethers.Contract(PRICE_ORACLE, IPriceOracle, signer);
  const temp = useRef();
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

  const updateCollateralCurrency = option => {
    if (selectedLeverageCurrencyType.label === option.label) {
      return;
    }
    updateSelectedCollateralCurrencyType(option);
  };
  const updateLeverageCurrency = option => {
    if (selectedCollateralCurrencyType.label === option.label) {
      return;
    }
    updateSelectedLeverageCurrencyType(option);
  };

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

  const closePosition = index => {
    console.log("useraccountdata", userAccountData);
    updateClickedButtonId(index);
    updateIsClosingPosition(true);
  };

  // usePoller(getTokenBalance, 3000);
  // usePoller(getReserveTokens, 3000);
  // usePoller(getReserveData, 15000);
  // usePoller(getUserAssetData, 6000);
  // usePoller(getUserInfo, 6000);
  //  debugger;
  return (
    <>
      {activeTokenData ? (
        <>
          <div className="table-positions">
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #1b432d" }}>
              <div className="table-positions-label">Positions</div>
              <div style={{ color: "#cbcbcb", fontSize: "15px" }}>
                Health Factor: {ethers.utils.formatUnits(userAccountData.healthFactor).slice(0, 7)}
              </div>
            </div>

            <Table borderless style={{ color: "#A5A5A5" }} className="main-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Symbol</th>
                  <th>Variable Debt</th>
                  <th>Stable Debt</th>
                  <th>ATokens</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {activeTokenData.map((tokenData, index) => {
                  return (
                    <tr key={`row${index}`}>
                      <th scope="row">
                        <img
                          className="swap-page-input-body-button-img"
                          src={tokenDataJson[tokenData.symbol].logo}
                        ></img>
                      </th>
                      <td>{tokenData.symbol}</td>
                      <td>{tokenData.variable ? ethers.utils.formatEther(tokenData.variable.toString()) : 0}</td>
                      <td>{tokenData.stable ? ethers.utils.formatEther(tokenData.stable.toString()) : 0}</td>
                      <td>
                        {tokenData.aToken ? ethers.utils.formatEther(tokenData.aToken.toString()).slice(0, 7) : 0}
                      </td>
                      <td>
                        <button
                          id={`buttonId${index}`}
                          className="close-position-button"
                          onClick={closePosition(index)}
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </>
      ) : (
        <>
          <div className="table-positions">
            <div ref={temp} id="abccc" className="table-positions-label">
              Positions
            </div>
            <div className="ghost">
              <svg width="73px" height="93px" viewBox="0 0 73 93" version="1.1" xmlns="http://www.w3.org/2000/svg">
                <title>noun_Ghost_2076593 Copy</title>
                <g id="Proto-V5-Green" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                  <g id="2" transform="translate(-964.000000, -357.000000)" fill="#858585" fill-rule="nonzero">
                    <g id="Group-2" transform="translate(680.000000, 112.000000)">
                      <g id="noun_Ghost_2076593-Copy" transform="translate(284.128463, 245.500000)">
                        <path
                          d="M61.1942195,10.8471359 C54.6450054,4.40025324 45.7421674,0.409325883 35.8160148,0.409325883 C16.0660409,0.409325883 0,16.4753668 0,36.2253406 L0,71.9888876 C0,73.4215282 0.613988824,74.6495059 1.53497206,75.5704891 C2.4559553,76.4914723 3.78626442,77.1054612 5.11657354,77.1054612 C7.98185472,77.1054612 10.2331471,74.8541688 10.2331471,71.9888876 L10.2331471,64.8781525 C10.2331471,63.4455119 10.8471359,62.2175342 11.7681191,61.296551 C12.6891024,60.3755677 14.0194115,59.7615789 15.3497206,59.7615789 C18.2150018,59.7615789 20.4662941,62.0128713 20.4662941,64.8781525 L20.4662941,81.2511878 L20.4662941,86.6747557 C20.4662941,89.5400369 22.7175865,91.7913293 25.5828677,91.7913293 C28.4481489,91.7913293 30.6994412,89.5400369 30.6994412,86.6747557 L30.6994412,86.3677613 L30.6994412,64.8781525 C30.6994412,62.0128713 32.9507336,59.7615789 35.8160148,59.7615789 C37.2486553,59.7615789 38.476633,60.3755677 39.3976162,61.296551 C40.3185995,62.2175342 40.9325883,63.5478433 40.9325883,64.8781525 L40.9325883,67.7108516 C40.9325883,70.5761328 43.1838807,72.8274251 46.0491618,72.8274251 C48.914443,72.8274251 51.1657354,70.5761328 51.1657354,67.7108516 L51.1657354,64.8781525 C51.1657354,62.0128713 53.4170277,59.7615789 56.2823089,59.7615789 C57.7149495,59.7615789 58.9429271,60.3755677 59.8639104,61.296551 C60.7848936,62.2175342 61.3988824,63.5478433 61.3988824,64.8781525 L61.3988824,78.7900441 C61.3988824,81.6553253 63.6501748,83.9066177 66.515456,83.9066177 C69.3807372,83.9066177 71.6320295,81.6553253 71.6320295,78.7900441 L71.6320295,59.7615789 L71.6320295,36.2253406 C71.6320295,26.299188 67.6411022,17.39635 61.1942195,10.8471359 Z M23.4860645,30.8271311 C18.6581066,30.8271311 14.7079593,26.8769838 14.7079593,22.049026 C14.7079593,17.2210681 18.6581066,13.2709208 23.4860645,13.2709208 C28.3140223,13.2709208 32.2641696,17.2210681 32.2641696,22.049026 C32.2641696,26.9867101 28.3140223,30.8271311 23.4860645,30.8271311 Z M35.9349028,51.7291815 C27.398369,51.7291815 20.325241,44.9221164 20.325241,36.4431405 L25.3252108,36.4431405 L27.7642204,41.4395392 C28.3739728,42.514339 29.9593291,42.514339 30.5690815,41.4395392 L33.0080912,36.4431405 L38.6178134,36.4431405 L41.0568231,41.4395392 C41.6665755,42.514339 43.2519318,42.514339 43.8616842,41.4395392 L46.3006939,36.4431405 L51.3006637,36.4431405 C51.5445646,44.9221164 44.4714366,51.7291815 35.9349028,51.7291815 Z M47.8450517,30.8271311 C43.5850889,30.8271311 40.0996648,27.341707 40.0996648,23.0817442 C40.0996648,18.8217814 43.5850889,15.3363573 47.8450517,15.3363573 C52.1050145,15.3363573 55.5904387,18.8217814 55.5904387,23.0817442 C55.5904387,27.4385244 52.1050145,30.8271311 47.8450517,30.8271311 Z"
                          id="Shape"
                        ></path>
                      </g>
                    </g>
                  </g>
                </g>
              </svg>
            </div>
            <div className="ghost-text">Your Positions will appear here.</div>
          </div>
          {temp.current ? (
            <>
              <Popover
                placement="auto"
                isOpen={isClosingPosition}
                isOpen={true}
                target="abccc"
                // target={`buttonId${clickedButtonId}`}
                toggle={() => updateIsClosingPosition(!isClosingPosition)}
                hideArrow
                innerClassName="close-position-popover"
                trigger="focus"
              >
                <PopoverHeader className="popover-header">Close Position</PopoverHeader>
                <PopoverBody className="popover-body">
                  <div className="asset-1">
                    <div className="1">
                      Symbol:
                      {
                        <button id="collateral-token-dd" className="swap-page-input-body-button">
                          <span className="swap-page-input-body-button-main-span">
                            <img
                              className="swap-page-input-body-button-img"
                              src={tokenDataJson[selectedCollateralCurrencyType.label].logo}
                            ></img>
                            <span className="swap-page-input-body-button-text">
                              {selectedCollateralCurrencyType.label}{" "}
                            </span>
                            <svg
                              width="12"
                              height="7"
                              viewBox="0 0 12 7"
                              fill="none"
                              className="swap-page-input-body-button-text-svg"
                            >
                              <path d="M0.97168 1L6.20532 6L11.439 1" stroke="#AEAEAE"></path>
                            </svg>
                          </span>
                        </button>
                      }
                    </div>
                    <div className="2">Variable Debt: 2.0018</div>
                    <div className="3">Stable Debt: 0.0</div>
                    <div className="4">ATokens: 0</div>
                  </div>
                  <div className="asset-2">
                    <div className="1">
                      Symbol:
                      {
                        <button id="leverage-token-dd" className="swap-page-input-body-button">
                          <span className="swap-page-input-body-button-main-span">
                            <img
                              className="swap-page-input-body-button-img"
                              src={tokenDataJson[selectedLeverageCurrencyType.label].logo}
                            ></img>
                            <span className="swap-page-input-body-button-text">
                              {selectedLeverageCurrencyType.label}
                            </span>
                            <svg
                              width="12"
                              height="7"
                              viewBox="0 0 12 7"
                              fill="none"
                              className="swap-page-input-body-button-text-svg"
                            >
                              <path d="M0.97168 1L6.20532 6L11.439 1" stroke="#AEAEAE"></path>
                            </svg>
                          </span>
                        </button>
                      }
                    </div>
                    <div className="2">Variable Debt: <Input value={variableDebt} /></div>
                    <div className="3">Stable Debt: 0.0</div>
                    <div className="4">ATokens: 0</div>
                  </div>
                  <div className="close-btn">
                    <Button color="danger" size="md">
                      Close
                    </Button>
                  </div>
                </PopoverBody>
              </Popover>
              <Popover
                placement="auto"
                isOpen={isSelectingCollateralCurrency}
                target="collateral-token-dd"
                toggle={() => updateIsSelectingCollateralCurrency(!isSelectingCollateralCurrency)}
                hideArrow
                popperClassName="custom-popover"
                innerClassName="custom-inner-popover"
                fade={true}
                trigger="focus"
              >
                <PopoverBody className="popover-body">
                  <div className="dd-wrapper">
                    {tokenOptionsForCollateral.map(option => {
                      return (
                        <div
                          key={option.value}
                          className="dd-option"
                          onClick={() => {
                            updateCollateralCurrency(option);
                            updateIsSelectingCollateralCurrency(false);
                          }}
                        >
                          <div className="dd-option-icon"></div>
                          <div
                            className={clsx("dd-option-text", {
                              active: selectedCollateralCurrencyType.label === option.label,
                            })}
                          >
                            {option.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </PopoverBody>
              </Popover>

              <Popover
                placement="auto"
                isOpen={isSelectingLeverageCurrency}
                target="leverage-token-dd"
                toggle={() => updateIsSelectingLeverageCurrency(!isSelectingLeverageCurrency)}
                hideArrow
                className="popover-main-body"
                trigger="focus"
              >
                <PopoverBody style={{ padding: "0px" }}>
                  <div className="dd-wrapper">
                    {tokenOptionsForLeveraging.map(option => {
                      return (
                        <div
                          key={option.value}
                          className="dd-option"
                          onClick={() => {
                            updateLeverageCurrency(option);
                            updateIsSelectingLeverageCurrency(false);
                          }}
                        >
                          <div className="dd-option-icon"></div>
                          <div
                            className={clsx("dd-option-text", {
                              active: selectedLeverageCurrencyType.label === option.label,
                            })}
                          >
                            {option.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </PopoverBody>
              </Popover>
            </>
          ) : (
            ""
          )}
        </>
      )}
    </>
  );
  // }
}

export default memo(UserData);
