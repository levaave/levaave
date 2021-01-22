import React, { useState, memo } from "react";
import { parseEther, formatEther } from "@ethersproject/units";
import { Row, Col, Input, Form, Label, Button } from "reactstrap";
import Select from "react-select";
import { abi } from "./levAave";
import { debtTokenAbi } from "./debtTokenABI";
import { iErc20Abi } from "./IERC20ABI";

import {
  Layout,
  Radio,
  // Button,
  // List,
  // Divider,
  // Input,
  // Card,
  // DatePicker,
  // Slider,
  // Switch,
  // Progress,
  // Spin,
} from "antd";
// import {
//   useContractLoader,
//   useContractReader,
// } from "../hooks";
import { Address, Balance } from "../components";
import { ethers } from "ethers";

const { Header, Content, Footer } = Layout;

function BasicUI(props) {
  // const contract = useContractLoader("LevAave");

  const [leverageType, updateLevergaeType] = useState("long");
  const [collateralAmount, updateCollateralAmount] = useState(0);
  const [selectedCollateralCurrencyType, updateSelectedCollateralCurrencyType] = useState({
    label: "WETH",
    value: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  });
  const [selectedLeverageCurrencyType, updateSelectedLeverageCurrencyType] = useState({
    label: "LINK",
    value: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
  });
  // const [selectedCollateralCurrencyType, updateCollateralAmount] = useState(0);
  const [leverageMulitplier, updateLeverageMultiplier] = useState(1);
  // const [selected]

  const userCurrencyOptions = [{ label: "WETH", value: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" }];

  const aaveContractAddress = {
    AWETH: "0x030bA81f1c18d280636F32af80b9AAd02Cf0854e",
    ALINK: "0xa06bC25B5805d5F8d82847D191Cb4Af5A3e873E0",
  };

  const optionsForLeveraging = [
    { label: "WETH", value: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" },
    { label: "LINK", value: "0x514910771AF9Ca656af840dff83E8264EcF986CA" },
    { label: "UNI", value: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984" },
  ];
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
  console.log(userProvider);
  const ourContractAddress = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
  const contract = new ethers.Contract(ourContractAddress, abi, localProvider);

  const wEthVariableTokenContract = new ethers.Contract(ourContractAddress, debtTokenAbi, userProvider);
  console.log(debtTokenAbi);
  const collateralTokenContract = new ethers.Contract(ourContractAddress, iErc20Abi, userProvider);

  // ---- credit delegation -----
  const getDelegationApproval = (tokenAddress, amount) => {
    const borrower = ourContractAddress;
    const amountInWei = ethers.utils.parseEther(amount);
    // get relevant contract depending upon token
    wEthVariableTokenContract.approveDelegation(borrower, amountInWei);
  };

  const isCreditDelegated = (tokenAddress, amount) => {
    const borrower = ourContractAddress;
    const amountInWei = ethers.utils.parseEther(amount);
    const userAddress = userProvider.selectedAddress;
    // get relevant contract depending upon token
    const totalDelegatedCreditAllowance = wEthVariableTokenContract.borrowAllowance(userAddress, borrower);
    if (totalDelegatedCreditAllowance >= amountInWei) {
      return true;
    }
    return false;
  };

  // ---- erc approvals ----
  const isCollateralApproved = (tokenAddress, amount) => {
    const beneficiary = ourContractAddress;
    const amountInWei = ethers.utils.parseEther(amount);
    const userAddress = userProvider.selectedAddress;
    // get relevant contract depending upon token
    const totalApproval = collateralTokenContract.allowance(userAddress, beneficiary);
    if (totalApproval >= amountInWei) {
      return true;
    }
    return false;
  };

  const approveCollateral = amount => {
    const beneficiary = ourContractAddress;
    const amountInWei = ethers.utils.parseEther(amount);
    // get relevant contract depending upon token
    collateralTokenContract.approve(beneficiary, amountInWei);
  };

  // --- form values ----
  const onChangeLeverageType = event => {
    const value = event.target.value;
    updateLevergaeType(value);
  };

  const leverage = () => {
    debugger;
    const collateralValueInWei = ethers.utils.parseEther(collateralAmount);
    if (!isCollateralApproved()) {
      approveCollateral(collateralValueInWei);
    }
    if (!isCreditDelegated()) {
      const valueToDelegate = ethers.utils.parseEther(10000);
      getDelegationApproval(selectedCollateralCurrencyType, valueToDelegate);
    }
    contract.myFlashLoanCall(
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      "0x514910771AF9Ca656af840dff83E8264EcF986CA",
      aaveContractAddress.ALINK,
      collateralValueInWei,
    );
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
                    onChange={selectedOption => updateSelectedCollateralCurrencyType(selectedOption)}
                  />

                  <br />
                  <Radio.Group onChange={onChangeLeverageType} value={leverageType}>
                    <Radio value={"long"}>Long</Radio>
                    <Radio value={"short"}>Short</Radio>
                  </Radio.Group>
                  <br />
                  <Label>Select the currency you want to Leverage</Label>
                  <Select
                    options={optionsForLeveraging}
                    value={selectedLeverageCurrencyType}
                    onChange={selectedOption => updateSelectedLeverageCurrencyType(selectedOption)}
                  />
                  <br />
                  <Label>Collateral amount</Label>
                  <Input
                    size={"lg"}
                    onChange={e => {
                      // let valueInWei = ethers.utils.parseEther();
                      updateCollateralAmount(e.target.value);
                    }}
                    value={collateralAmount}
                  />
                  <br />
                  {/* <Label>Leverage Multiplier</Label>
                  <Input size={"lg"} onChange={e => updateLeverageMultiplier(e.target.value)
                    value={}
                  } /> */}
                  <br />
                  <Button onClick={() => leverage()}>Submit </Button>
                </Form>
                {/* <Select /> */}
              </div>
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
