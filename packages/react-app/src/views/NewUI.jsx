import React, { useState, memo, useEffect } from "react";
import { Popover, PopoverBody } from "reactstrap";
// import Select from "react-select";
import flashloancontract from "../contracts/LevAave.address.js";
import { useUserAddress } from "eth-hooks";
import { Layout } from "antd";
import { ethers } from "ethers";
import abi from "../contracts/LevAave.abi";
import { debtTokenAbi } from "./debtTokenABI";
import { iErc20Abi } from "./IERC20ABI";
import { abi as AAVEIDataProvider } from "../abis/AAVEProtocolDataProvider.json";
import {
  getListOfTokensSupportedByAAVE,
  // getApprove1inchData,
  get1InchQuote,
  get1InchSwapData,
} from "../helpers/abiHelpers";
import "./NewUI.styles.scss";
import clsx from "clsx";
// import { debounce } from "debounce";
// import UserData from "./UserData";
import Positions from "./Positions";

const { Header, Content } = Layout;

function NewUI(props) {
  const {
    // address,
    // mainnetProvider,
    userProvider,
    // localProvider,
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
  // const LENDING_POOL = "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9";
  // const PRICE_ORACLE = "0xa50ba011c48153de246e5192c8f9258a2ba79ca9";
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

  const [tokenOptionsForLeveraging, updateTokenOptionsForLeveraging] = useState([]);

  const aTokensAddress = {
    AAVE: "0xFFC97d72E13E01096502Cb8Eb52dEe56f74DAD7B",
    BAT: "0x05Ec93c0365baAeAbF7AefFb0972ea7ECdD39CF1",
    BUSD: "0xA361718326c15715591c299427c62086F69923D9",
    CRV: "0x8dAE6Cb04688C62d939ed9B68d32Bc62e49970b1",
    DAI: "0x028171bCA77440897B824Ca71D1c56caC55b68A3",
    ENJ: "0xaC6Df26a590F08dcC95D5a4705ae8abbc88509Ef",
    GUSD: "0xD37EE7e4f452C6638c96536e68090De8cBcdb583",
    KNC: "0x39C6b3e42d6A679d7D776778Fe880BC9487C2EDA",
    LINK: "0xa06bC25B5805d5F8d82847D191Cb4Af5A3e873E0",
    MANA: "0xa685a61171bb30d4072B338c80Cb7b2c865c873E",
    MKR: "0xc713e5E149D5D0715DcD1c156a020976e7E56B88",
    REN: "0xCC12AbE4ff81c9378D670De1b57F8e0Dd228D77a",
    SNX: "0x35f6B052C598d933D69A4EEC4D04c73A191fE6c2",
    SUSD: "0x6C5024Cd4F8A59110119C56f8933403A539555EB",
    TUSD: "0x101cc05f4A51C0319f570d5E146a8C625198e636",
    UNI: "0xB9D7CB55f463405CDfBe4E90a6D2Df01C2B92BF1",
    USDC: "0xBcca60bB61934080951369a648Fb03DF4F96263C",
    USDT: "0x3Ed3B47Dd13EC9a98b44e6204A523E766B225811",
    WBTC: "0x9ff58f4fFB29fA2266Ab25e75e2A8b3503311656",
    WETH: "0x030bA81f1c18d280636F32af80b9AAd02Cf0854e",
    YFI: "0x5165d24277cD063F5ac44Efd447B27025e888f37",
    ZRX: "0xDf7FF54aAcAcbFf42dfe29DD6144A69b629f8C9e",
  };

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

  const userAddress = useUserAddress(userProvider);

  //* ---- credit delegation -----
  const getDelegationApproval = async tokenAddress => {
    try {
      const reserveAddresses = await dataProviderContract.getReserveTokensAddresses(tokenAddress);
      const variableDebtTokenContract = new ethers.Contract(
        reserveAddresses.variableDebtTokenAddress,
        debtTokenAbi,
        signer,
      );
      const amountInWei = ethers.utils.parseUnits("100000000");
      await variableDebtTokenContract.approveDelegation(ourContractAddress, amountInWei);
      // get relevant contract depending upon token
    } catch (ex) {
      console.log(ex);
    }
  };

  const isCreditDelegated = async (tokenAddress, amount) => {
    try {
      const reserveAddresses = await dataProviderContract.getReserveTokensAddresses(tokenAddress);
      const variableDebtTokenContract = new ethers.Contract(
        reserveAddresses.variableDebtTokenAddress,
        debtTokenAbi,
        signer,
      );
      const amountInWei = ethers.utils.parseEther(amount);
      // get relevant contract depending upon token
      const totalDelegatedCreditAllowance = await variableDebtTokenContract.borrowAllowance(
        userAddress,
        ourContractAddress,
      );
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
      const collateralTokenContract = new ethers.Contract(tokenAddress, iErc20Abi, signer);
      const amountInWei = ethers.utils.parseEther(amount);
      // get relevant contract depending upon token
      const totalApproval = await collateralTokenContract.allowance(userAddress, ourContractAddress);
      if (totalApproval.gte(amountInWei)) {
        return true;
      }
      return false;
    } catch (e) {
      console.log(e);
    }
  };

  const approveCollateral = async tokenAddress => {
    try {
      const collateralTokenContract = new ethers.Contract(tokenAddress, iErc20Abi, signer);
      const amountInWei = ethers.utils.parseEther("100000000");
      // get relevant contract depending upon token
      let result = await collateralTokenContract.approve(ourContractAddress, amountInWei);
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

  const updateLeverageAmountAndGetQuote = async amount => {
    if (
      Number.isNaN(Number.parseInt(amount, 10)) ||
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
      Number.isNaN(Number.parseInt(amount, 10)) ||
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

  const execute = () => {
    if (leverageType === "long") {
      leverageLong();
    } else if (leverageType === "short") {
      leverageShort();
    }
  };

  const leverageLong = async () => {
    let convertedCollateral = (parseFloat(collateralAmount) * leverageMultiplier).toString();
    const collateralValueInWei = ethers.utils.parseEther(convertedCollateral);
    if (!(await isCollateralApproved(selectedCollateralCurrencyType.value, "1000000"))) {
      await approveCollateral(selectedCollateralCurrencyType.value);
    }
    if (!(await isCreditDelegated(selectedCollateralCurrencyType.value, "1000000"))) {
      await getDelegationApproval(selectedCollateralCurrencyType.value);
    }
    let amountFor1Inch = ethers.utils
      .parseUnits((parseFloat(convertedCollateral) + parseFloat(collateralAmount)).toString())
      .toString();
    let swapData = await get1InchSwapData(
      selectedCollateralCurrencyType.value,
      selectedLeverageCurrencyType.value,
      amountFor1Inch,
      ourContractAddress,
      maximumSlippageApproved,
    );
    const tx = await contract.myFlashLoanCall(
      selectedCollateralCurrencyType.value,
      selectedLeverageCurrencyType.value,
      aTokensAddress[selectedLeverageCurrencyType.label],
      "0x0000000000000000000000000000000000000000",
      collateralValueInWei,
      0,
      0,
      swapData.tx.data,
      leverageMultiplier,
    );
    await tx.wait();
  };

  const leverageShort = async () => {
    if (!(await isCollateralApproved(selectedCollateralCurrencyType.value, "1000000"))) {
      await approveCollateral(selectedCollateralCurrencyType.value);
    }
    if (!(await isCreditDelegated(selectedLeverageCurrencyType.value, "1000000"))) {
      await getDelegationApproval(selectedLeverageCurrencyType.value);
    }
    let shortCollateral = ethers.utils.parseUnits((parseFloat(leverageAmount) * 2).toString());
    let swapData = await get1InchSwapData(
      selectedLeverageCurrencyType.value,
      selectedCollateralCurrencyType.value,
      shortCollateral.toString(),
      ourContractAddress,
      maximumSlippageApproved,
    );
    const tx = await contract.myFlashLoanCall(
      selectedLeverageCurrencyType.value, // asset to short
      selectedCollateralCurrencyType.value, // collateral
      "0x0000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000",
      shortCollateral, // amount asset to short
      2, // operation
      ethers.utils.parseEther(collateralAmount), //collateral amount
      swapData.tx.data,
      0,
    );
    await tx.wait();
  };

  return (
    <Layout>
      {/* <Positions signer={signer} /> */}
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
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
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
                        inputMode="decimal"
                        title="Token Amount"
                        type="text"
                        pattern="^[0-9]*[.,]?[0-9]*$"
                        placeholder="0.0"
                        minLength="1"
                        maxLength="79"
                        spellCheck="false"
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
                      className={clsx({ "leverage-box": true, active: leverageMultiplier === 1 })}
                      onClick={() => updateLeverageMultiplier(1)}
                    >
                      2x
                    </div>
                    <div
                      className={clsx({ "leverage-box": true, active: leverageMultiplier === 2 })}
                      onClick={() => updateLeverageMultiplier(2)}
                    >
                      3x
                    </div>
                    <div
                      className={clsx({ "leverage-box": true, active: leverageMultiplier === 3 })}
                      onClick={() => updateLeverageMultiplier(3)}
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
                        inputMode="decimal"
                        title="Token Amount"
                        autoComplete="off"
                        autoCorrect="off"
                        type="text"
                        pattern="^[0-9]*[.,]?[0-9]*$"
                        placeholder="0.0"
                        minLength="1"
                        maxLength="79"
                        spellCheck="false"
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
                            className="swap-page-input-body-button-text-svg"
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
                <button className="levaave-button" onClick={execute}>
                  Flash - Leverage
                </button>
              </div>
            </div>
          </div>

          {/* <UserData signer={signer} liveAsset={selectedLeverageCurrencyType} /> */}
          <Popover
            placement="auto"
            isOpen={isSelectingCollateralCurrency}
            target="collateral-token-dd"
            toggle={() => updateIsSelectingCollateralCurrency(!isSelectingCollateralCurrency)}
            hideArrow
          >
            <PopoverBody>
              <div className="dd-wrapper">
                {tokenOptionsForLeveraging.map(option => {
                  return (
                    <div
                      key={option.value}
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
                      key={option.value}
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
