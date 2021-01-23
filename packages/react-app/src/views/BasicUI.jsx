import React, { useState, memo } from "react";
import { parseEther, formatEther } from "@ethersproject/units";
import { Row, Col, Input, Form, Label, Button } from "reactstrap";
import Select from "react-select";
import abi  from "../contracts/LevAave.abi";
import flashloancontract from "../contracts/LevAave.address.js"
import { debtTokenAbi } from "./debtTokenABI";
import { iErc20Abi } from "./IERC20ABI";
import { useUserAddress } from "eth-hooks";
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
  // console.log(userProvider.provider);
  const ourContractAddress = flashloancontract;
  const signer = userProvider.getSigner();
  const contract = new ethers.Contract(ourContractAddress, abi, signer);

  const wEthVariableTokenContract = new ethers.Contract(
    "0xF63B34710400CAd3e044cFfDcAb00a0f32E33eCf",
    debtTokenAbi,
    signer,
  );
  // console.log(debtTokenAbi);
  const collateralTokenContract = new ethers.Contract("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", iErc20Abi, signer);

  const userAddress = useUserAddress(userProvider);

  // ---- credit delegation -----
  const getDelegationApproval = async (tokenAddress, amount) => {
    try {
      // debugger;
      const borrower = ourContractAddress;
      const amountInWei = amount;
      let r = await wEthVariableTokenContract.approveDelegation(borrower, amountInWei);
      console.log(r)
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
      const totalDelegatedCreditAllowance = await wEthVariableTokenContract.borrowAllowance(userAddress, borrower);
      console.log("delegated", totalDelegatedCreditAllowance, "required", amountInWei)
      if (totalDelegatedCreditAllowance >= amountInWei) {
        return true;
      }
      return false;
    } catch (ex) {
      console.log(ex);
    }
  };

  // ---- erc approvals ----
  const isCollateralApproved = async (tokenAddress, amount) => {
    try {
      // debugger;
      const beneficiary = ourContractAddress;
      const amountInWei = ethers.utils.parseEther(amount);
      // get relevant contract depending upon token
      const totalApproval = await collateralTokenContract.allowance(userAddress, beneficiary);
      console.log("totalApproval", totalApproval, "required", amountInWei)
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
      console.log("approvingCollateral")
      const beneficiary = ourContractAddress;
      const amountInWei = ethers.utils.parseEther(amount);
      // get relevant contract depending upon token
      let result = await collateralTokenContract.approve(beneficiary, amountInWei);
      // debugger;
      console.log(result)
      if (result.hash) return true;
      else return false;
    } catch (e) {
      console.log(e.toString());
    }
  };

  // --- form values ----
  const onChangeLeverageType = event => {
    const value = event.target.value;
    updateLevergaeType(value);
  };

  const leverage = async () => {
    // debugger;
    console.log("user", userAddress)
    const collateralValueInWei = ethers.utils.parseEther(collateralAmount);
    if (!(await isCollateralApproved("", collateralAmount))) {
      await approveCollateral(collateralAmount);
    }
    if (!(await isCreditDelegated("", "10000000"))) {
      const valueToDelegate = ethers.utils.parseEther("10000000");
      await getDelegationApproval(selectedCollateralCurrencyType, valueToDelegate);
    }
    const tx = await contract.myFlashLoanCall(
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      "0x514910771AF9Ca656af840dff83E8264EcF986CA",
      aaveContractAddress.ALINK,
      collateralValueInWei,
      0,
      "0x0000000000000000000000000000000000000000", // collateralAsset we don't need it on operation 0
      0 // c we don't need it on operation 0
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
                  <Button onClick={leverage}>Submit </Button>
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
