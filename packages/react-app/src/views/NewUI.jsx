import React, { useState, memo, useEffect } from "react";
import { parseEther, formatEther } from "@ethersproject/units";
import { Row, Col, Input, Form, Label, Button, Popover, PopoverBody } from "reactstrap";
import Select from "react-select";
import flashloancontract from "../contracts/LevAave.address.js";
import { useUserAddress } from "eth-hooks";
import { Layout, Radio } from "antd";
import { ethers } from "ethers";
import abi from "../contracts/LevAave.abi";
import { debtTokenAbi } from "./debtTokenABI";
import { iErc20Abi } from "./IERC20ABI";
import { abi as AAVEIDataProvider } from "../abis/AAVEProtocolDataProvider.json";
import {
  getListOfTokensSupportedByAAVE,
  getApprove1inchData,
  get1InchQuote,
  get1InchSwapData,
} from "../helpers/abiHelpers";
import "./NewUI.styles.scss";
import clsx from "clsx";
import { debounce } from "debounce";
import UserData from './UserData';

const { Header, Content, Footer } = Layout;

function NewUI(props) {
  const {
    // address,
    // mainnetProvider,
    userProvider,
    localProvider,
    // yourLocalBalance,
    // price,
    // tx,
    // readContracts,
    // writeContracts,
  } = props;

  //* --- all constants ---
  const ourContractAddress = flashloancontract;
  const signer = userProvider.getSigner();
  const AAVE_PROTOCOL_DATA_PROVIDER_ADDRESS = "0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d";
  const LENDING_POOL = "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9";
  const PRICE_ORACLE = "0xa50ba011c48153de246e5192c8f9258a2ba79ca9";
  //* --- all constants ---

  //* --- all contract initializations ---
  let dataProviderContract = new ethers.Contract(
    AAVE_PROTOCOL_DATA_PROVIDER_ADDRESS,
    AAVEIDataProvider,
    userProvider.getSigner(),
  );
  const contract = new ethers.Contract(ourContractAddress, abi, signer);
  //* --- end of contract initializations ---

  //* --- state variables ---
  const [isLoading, updateIsLoading] = useState("long");
  const [leverageType, updateLeverageType] = useState("long");
  const [collateralAmount, updateCollateralAmount] = useState("");
  const [leverageAmount, updateLeverageAmount] = useState("");
  const [maximumSlippageApproved, updateMaximumSlippageApproved] = useState(1);
  const [leverageMultiplier, updateLeverageMultiplier] = useState(2);
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
  const userCurrencyOptions = [{ label: "WETH", value: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" }];
  const [tokenOptionsForLeveraging, updateTokenOptionsForLeveraging] = useState([]);
  // [
  //   { label: "WETH", value: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" },
  //   { label: "LINK", value: "0x514910771AF9Ca656af840dff83E8264EcF986CA" },
  //   { label: "UNI", value: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984" },
  // ];
  const aaveContractAddress = {
    WETH: "0x030bA81f1c18d280636F32af80b9AAd02Cf0854e",
    LINK: "0xa06bC25B5805d5F8d82847D191Cb4Af5A3e873E0",
  };

  const [listOfSupportedTokensFromAAVE, updateListOfSupportedTokensFromAAVE] = useState([]);

  //* --- state variables ---

  useEffect(() => {
    const isFetchingInfo = async () => {
      updateIsLoading(true);

      const listOfAAVESupporterTokens = await getListOfTokensSupportedByAAVE(dataProviderContract);
      const selectDropdownList = [{ label: "Select currency type", value: "" }];
      listOfAAVESupporterTokens.forEach(token => {
        const option = { label: token.symbol, value: token.tokenAddress };
        selectDropdownList.push(option);
      });
      updateTokenOptionsForLeveraging(selectDropdownList);

      updateIsLoading(false);
    };
    isFetchingInfo();
  }, []);

  let variableDebtTokenContract = new ethers.Contract(
    "0xF63B34710400CAd3e044cFfDcAb00a0f32E33eCf",
    debtTokenAbi,
    signer,
  );
  // console.log(debtTokenAbi);
  let collateralTokenContract = new ethers.Contract("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", iErc20Abi, signer);

  const userAddress = useUserAddress(userProvider);

  //* ---- credit delegation -----
  const getDelegationApproval = async (tokenAddress, amount) => {
    try {
      // debugger;
      const borrower = ourContractAddress;
      const amountInWei = ethers.utils.parseUnits("100000000000");
      let r = await variableDebtTokenContract.approveDelegation(borrower, amountInWei);
      console.log(r);
      // get relevant contract depending upon token
    } catch (ex) {
      console.log(ex);
    }
  };

  const isCreditDelegated = async (tokenAddress, amount) => {
    try {
      // debugger;
      const borrower = ourContractAddress;
      const amountInWei = ethers.utils.parseEther(amount);
      // get relevant contract depending upon token
      const totalDelegatedCreditAllowance = await variableDebtTokenContract.borrowAllowance(userAddress, borrower);
      console.log("delegated", totalDelegatedCreditAllowance, "required", amountInWei);
      if (totalDelegatedCreditAllowance >= amountInWei) {
        return true;
      }
      return false;
    } catch (ex) {
      console.log(ex);
    }
  };

  //* ---- erc approvals ----
  const isCollateralApproved = async (tokenAddress, amount) => {
    try {
      // debugger;
      const beneficiary = ourContractAddress;
      const amountInWei = ethers.utils.parseEther(amount);
      // get relevant contract depending upon token
      const totalApproval = await collateralTokenContract.allowance(userAddress, beneficiary);
      console.log("totalApproval", totalApproval, "required", amountInWei);
      if (totalApproval.gte(amountInWei)) {
        return true;
      }
      return false;
    } catch (e) {
      console.log(e);
    }
  };

  const approveCollateral = async amount => {
    // debugger;
    try {
      console.log("approvingCollateral");
      const beneficiary = ourContractAddress;
      const amountInWei = ethers.utils.parseEther("100000000000");
      // get relevant contract depending upon token
      let result = await collateralTokenContract.approve(beneficiary, amountInWei);
      // debugger;
      console.log(result);
      if (result.hash) return true;
      else return false;
    } catch (e) {
      console.log(e.toString());
    }
  };

  const getSwapQuote = async (fromTokenAddress, toTokenAddress, amount) => {
    let response = await get1InchQuote(fromTokenAddress, toTokenAddress, amount);
    return ethers.utils.formatEther(response.toTokenAmount);
  };

  //* --- form values ----
  const onChangeLeverageType = value => {
    // debugger;
    updateLeverageType(value);
  };

  const updateContractForSelectedleverageCurrencyType = tokenAddress => {
    variableDebtTokenContract = new ethers.Contract(tokenAddress, debtTokenAbi, signer);
  };
  const updateContractForSelectedCollateralCurrencyType = tokenAddress => {
    collateralTokenContract = new ethers.Contract(tokenAddress, iErc20Abi, signer);
  };
  const get1inchData = () => {
    let approvalData = getApprove1inchData(selectedCollateralCurrencyType.value);
    let swapData = get1InchSwapData(
      selectedCollateralCurrencyType.value,
      selectedLeverageCurrencyType.value,
      collateralAmount,
      ourContractAddress,
      maximumSlippageApproved,
    );
  };

  const updateLeverageAmountAndGetQuote = async amount => {
    if (
      Number.parseInt(amount, 10) === NaN ||
      !selectedCollateralCurrencyType.value ||
      !selectedLeverageCurrencyType.value
    ) {
      return;
    }
    updateLeverageAmount(amount);
    updateIsLoading(true);
    let leverageAmountInWei = ethers.utils.parseEther(amount);
    const quotedCollateralAmountInWei = await getSwapQuote(
      selectedLeverageCurrencyType.value,
      selectedCollateralCurrencyType.value,
      leverageAmountInWei,
    );
    updateIsLoading(false);
    updateCollateralAmount(quotedCollateralAmountInWei);
  };
  const updateCollateralAmountAndGetQuote = async amount => {
    if (
      Number.parseInt(amount, 10) === NaN ||
      !selectedCollateralCurrencyType.value ||
      !selectedLeverageCurrencyType.value
    ) {
      return;
    }
    updateCollateralAmount(amount);
    let collateralAmountInWei = ethers.utils.parseEther(amount);
    updateIsLoading(true);

    const quotedLeverageAmountInWei = await getSwapQuote(
      selectedCollateralCurrencyType.value,
      selectedLeverageCurrencyType.value,
      collateralAmountInWei,
    );

    updateIsLoading(false);
    updateLeverageAmount(quotedLeverageAmountInWei);
  };

  const leverage = async () => {
    // console.log("user", userAddress);
    let convertedCollateral = (parseFloat(collateralAmount) * 2).toString();
    const collateralValueInWei = ethers.utils.parseEther(convertedCollateral);
    if (!(await isCollateralApproved("", convertedCollateral))) {
      await approveCollateral(convertedCollateral);
    }
    if (!(await isCreditDelegated("", "10000000"))) {
      const valueToDelegate = ethers.utils.parseEther("10000000");
      await getDelegationApproval(selectedCollateralCurrencyType, valueToDelegate);
    }
    let amountFor1Inch = ethers.utils.parseUnits((parseFloat(convertedCollateral) * 1.5).toString()).toString();
    let approveData = await getApprove1inchData(selectedCollateralCurrencyType.value);
    console.log(approveData);
    let swapData = await get1InchSwapData(
      selectedCollateralCurrencyType.value,
      selectedLeverageCurrencyType.value,
      amountFor1Inch,
      ourContractAddress,
      maximumSlippageApproved,
    );
    console.log("collvaluewei", ethers.utils.formatUnits(collateralValueInWei));
    const tx = await contract.myFlashLoanCall(
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      selectedLeverageCurrencyType.value,
      aaveContractAddress[selectedLeverageCurrencyType.label],
      "0x0000000000000000000000000000000000000000",
      collateralValueInWei,
      0,
      0,
      swapData.tx.data,
      approveData.data,
    );
    await tx.wait();
  };

  return (
    <Layout>
      <Header className="header-levaave">
        <div className="header-main-text">LevAave</div>
      </Header>
      <Content className="main-background">
        <>
          <div className="main-div">
            {/* Header of the swap Box */}
            <div className="swap-page-header-div">
              <div className="swap-page-header">
                <div className="swap-page-header-text"> Flash Loan Swap </div>
                <div className="swap-page-header-setting">
                  <button className="setting-icon-button">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      className="setting-svg"
                    >
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Inputs to be taken and slippage  */}
            <div className="swap-page-body">
              <div className="swap-page-grid">
                {/* Collateral BOX */}
                <div className="swap-page-collateral-loan-div">
                  <div className="swap-page-input-div">
                    {/* Input Collateral Label */}
                    <div className="swap-page-input-label-div">
                      <div className="swap-page-input-label-text-div">
                        <div className="swap-page-input-label-text">Collateral</div>
                      </div>
                    </div>

                    {/* Input Collateral Body */}
                    <div className="swap-page-input-body">
                      <input
                        className="swap-page-input-body-input"
                        inputmode="decimal"
                        title="Token Amount"
                        type="text"
                        pattern="^[0-9]*[.,]?[0-9]*$"
                        placeholder="0.0"
                        minlength="1"
                        maxlength="79"
                        spellcheck="false"
                        onChange={e => {
                          updateCollateralAmountAndGetQuote(e.target.value);
                        }}
                        value={collateralAmount}
                      />
                      <button id="collateral-token-dd" className="swap-page-input-body-button">
                        <span className="swap-page-input-body-button-main-span">
                          {/* <img className="swap-page-input-body-button-img"></img> */}
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
                    </div>
                  </div>
                </div>

                {/* Position Short or Long */}
                <div className="postion-leverage-div">
                  {/* Position */}
                  <div className="position-div">
                    <div className="position-label-div">Position:</div>
                    <div
                      onClick={() => onChangeLeverageType("long")}
                      className={clsx({ "position-box": true, active: leverageType === "long" })}
                    >
                      Long
                    </div>
                    <div
                      onClick={() => onChangeLeverageType("short")}
                      className={clsx({ "position-box": true, active: leverageType === "short" })}
                    >
                      Short
                    </div>
                  </div>

                  <div className="leverage-div">
                    <div className="leverage-label-div">Leverage:</div>
                    <div
                      className={clsx({ "leverage-box": true, active: leverageMultiplier === 2 })}
                      onClick={() => updateLeverageMultiplier(2)}
                    >
                      2x
                    </div>
                    <div
                      className={clsx({ "leverage-box": true, active: leverageMultiplier === 3 })}
                      onClick={() => updateLeverageMultiplier(3)}
                    >
                      3x
                    </div>
                    <div
                      className={clsx({ "leverage-box": true, active: leverageMultiplier === 4 })}
                      onClick={() => updateLeverageMultiplier(4)}
                    >
                      4x
                    </div>
                  </div>
                </div>

                {/* Leverage box  */}
                <div className="swap-page-collateral-loan-div">
                  <div className="swap-page-input-div">
                    {/* Input Leverage Label */}
                    <div className="swap-page-input-label-div">
                      <div className="swap-page-input-label-text-div">
                        <div className="swap-page-input-label-text">Leverage Asset</div>
                      </div>
                    </div>

                    {/* Input Leverage Body */}
                    <div className="swap-page-input-body">
                      <input
                        className="swap-page-input-body-input"
                        inputmode="decimal"
                        title="Token Amount"
                        autocomplete="off"
                        autocorrect="off"
                        type="text"
                        pattern="^[0-9]*[.,]?[0-9]*$"
                        placeholder="0.0"
                        minlength="1"
                        maxlength="79"
                        spellcheck="false"
                        onChange={e => {
                          updateLeverageAmountAndGetQuote(e.target.value);
                        }}
                        value={leverageAmount}
                      ></input>
                      <button id="leverage-token-dd" className="swap-page-input-body-button">
                        <span className="swap-page-input-body-button-main-span">
                          {/* <img className="swap-page-input-body-button-img"></img> */}
                          <span className="swap-page-input-body-button-text">{selectedLeverageCurrencyType.label}</span>
                          <svg
                            width="12"
                            height="7"
                            viewBox="0 0 12 7"
                            fill="none"
                            class="swap-page-input-body-button-text-svg"
                          >
                            <path d="M0.97168 1L6.20532 6L11.439 1" stroke="#AEAEAE"></path>
                          </svg>
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Slippage Tollerance Div */}
                <div className="slippage-tolerance-parent-div">
                  <div className="slippage-tolerance-grid-div">
                    <div className="slippage-tolerance-div">
                      <div className="slippage-tolerance-label">Slippage Tolerance</div>
                      <div className="slippage-tolerance-percentage">1 %</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Final Leverage Call Button  */}
              <div style={{ marginTop: "1rem" }}>
                <button className="levaave-button">Flash - Leverage</button>
              </div>
            </div>
          </div>

          <UserData signer={signer} liveAsset={selectedLeverageCurrencyType} />
          <Popover
            placement="auto"
            isOpen={isSelectingCollateralCurrency}
            target="collateral-token-dd"
            toggle={() => updateIsSelectingCollateralCurrency(!isSelectingCollateralCurrency)}
            hideArrow
          >
            <PopoverBody>
              <div className="dd-wrapper">
                {userCurrencyOptions.map(option => {
                  return (
                    <div
                      className="dd-option"
                      onClick={() => {
                        updateSelectedCollateralCurrencyType(option);
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
          >
            <PopoverBody>
              <div className="dd-wrapper">
                {tokenOptionsForLeveraging.map(option => {
                  return (
                    <div
                      className="dd-option"
                      onClick={() => {
                        updateSelectedLeverageCurrencyType(option);
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
      </Content>
    </Layout>
  );
}

export default memo(NewUI);
