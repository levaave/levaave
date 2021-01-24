import React, { useState, memo, useEffect } from "react";
import { parseEther, formatEther } from "@ethersproject/units";
import { Row, Col, Input, Form, Label, Button } from "reactstrap";
import Select from "react-select";
import flashloancontract from "../contracts/LevAave.address.js";
import { useUserAddress } from "eth-hooks";
// import { useAsync, IfPending, IfFulfilled, IfRejected } from "react-async";
import { Layout, Radio } from "antd";
// import { Address, Balance } from "../components";
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

const { Header, Content, Footer } = Layout;

function BasicUI(props) {
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

  const [selectedCollateralCurrencyType, updateSelectedCollateralCurrencyType] = useState({
    label: "WETH",
    value: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  });
  const [selectedLeverageCurrencyType, updateSelectedLeverageCurrencyType] = useState({
    label: "Choose an option",
    value: null,
  });
  const [leverageMulitplier, updateLeverageMultiplier] = useState(1);
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

  useEffect(async () => {
    updateIsLoading(true);
    const listOfAAVESupporterTokens = await getListOfTokensSupportedByAAVE(dataProviderContract);
    const selectDropdownList = [{ label: "Select currency type", value: "" }];
    listOfAAVESupporterTokens.forEach(token => {
      const option = { label: token.symbol, value: token.tokenAddress };
      selectDropdownList.push(option);
    });
    updateTokenOptionsForLeveraging(selectDropdownList);
    updateIsLoading(false);
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
  const onChangeLeverageType = event => {
    const value = event.target.value;
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
      amount === "" ||
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
      amount === "" ||
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
      <Header>
        <div style={{ width: "100%", height: "100%", color: "white" }}>Prototype 1</div>
      </Header>
      <Content>
        <div style={{ width: "100%", height: "500px" }}>
          <Row>
            <Col sm={3}></Col>
            <Col sm={6}>
              {isLoading ? (
                "Loading"
              ) : (
                <div
                  style={{
                    display: "block",
                    height: "100%",
                    width: "100%",
                    borderRadius: "10px",
                    border: "1px solid grey",
                    marginTop: "10px",
                  }}
                >
                  <Form>
                    <Label>Select the currency you want to deposit</Label>
                    <Select
                      options={userCurrencyOptions}
                      value={selectedCollateralCurrencyType}
                      onChange={selectedOption => {
                        updateContractForSelectedCollateralCurrencyType(selectedOption.value);
                        updateSelectedCollateralCurrencyType(selectedOption);
                      }}
                    />

                    <br />
                    <Radio.Group onChange={onChangeLeverageType} value={leverageType}>
                      <Radio value={"long"}>Long</Radio>
                      <Radio value={"short"}>Short</Radio>
                    </Radio.Group>
                    <br />
                    <Label>Select the currency you want to Leverage</Label>
                    <Select
                      options={tokenOptionsForLeveraging}
                      value={selectedLeverageCurrencyType}
                      onChange={selectedOption => {
                        updateContractForSelectedleverageCurrencyType(selectedOption.value);
                        updateSelectedLeverageCurrencyType(selectedOption);
                      }}
                    />
                    <br />
                    <Label>Collateral amount</Label>
                    <Input
                      size={"lg"}
                      onChange={e => {
                        // let valueInWei = ethers.utils.parseEther();
                        // updateCollateralAmount(e.target.value);
                        updateCollateralAmountAndGetQuote(e.target.value);
                      }}
                      value={collateralAmount}
                    />
                    <br />
                    <Label>Leverage amount</Label>
                    <Input
                      size={"lg"}
                      onChange={e => {
                        updateLeverageAmountAndGetQuote(e.target.value);
                        // let valueInWei = ethers.utils.parseEther();
                        // updateLeverageAmount(e.target.value);
                      }}
                      value={leverageAmount}
                    />
                    <br />
                    {/* <Label>Leverage Multiplier</Label>
                    <Input size={"lg"} onChange={e => updateLeverageMultiplier(e.target.value)
                      value={}
                    } /> */}
                    <br />
                    <Button onClick={leverage}>Submit </Button>
                  </Form>
                  {/* <Select /> */}
                </div>
              )}
            </Col>
            <Col sm={3}></Col>
          </Row>
        </div>
      </Content>
      <Footer style={{ width: "100%", height: "40px", color: "white", backgroundColor: "black" }}>
        Reach out to us here.
      </Footer>
    </Layout>
  );
}

export default memo(BasicUI);
