const { expect } = require("chai");
const { ethers } = require("hardhat");

let lendingPool;
let weth;
let aweth;
let usdc;
let uniswap;
let usdcDebt;

describe("levaave", function () {
  before(async () => {
    this.timeout(120000);
    deployer = ethers.provider.getSigner(0);
    const Weth = await ethers.getContractFactory("WETH9");
    weth = Weth.attach("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
    const AWeth = await ethers.getContractFactory("WETH9");
    aweth = AWeth.attach("0x030bA81f1c18d280636F32af80b9AAd02Cf0854e");
    const Usdc = await ethers.getContractFactory("WETH9");
    usdc = Usdc.attach("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
    usdcDebt = await ethers.getContractAt(
      "DebtTokenBase",
      "0x619beb58998eD2278e08620f97007e1116D5D25b"
    );
    wethDebt = await ethers.getContractAt(
      "DebtTokenBase",
      "0xF63B34710400CAd3e044cFfDcAb00a0f32E33eCf"
    );

    const Flashloan = await ethers.getContractFactory("LevAave");
    flashloan = await Flashloan.deploy(
      "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5"
    );
    const Uniswap = await ethers.getContractFactory("UniswapV2Router02");
    uniswap = Uniswap.attach("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D");
    lendingPool = await ethers.getContractAt(
      "ILendingPool",
      "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9"
    );
  });
  it("open long position", async function () {
    this.timeout(120000);
    balance = await usdc.balanceOf(deployer.getAddress());
    console.log("jsbalance", ethers.utils.formatUnits(balance, 6));
    txApprove = await weth.approve(
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      ethers.utils.parseEther("10000000")
    );
    await txApprove.wait();
    txDeposit = await weth.deposit({ value: ethers.utils.parseEther("100") });
    usdc.approve(flashloan.address, ethers.utils.parseEther("1000000000"));
    txApproveUni = await weth.approve(
      "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      ethers.utils.parseEther("10000000")
    );
    await txApproveUni.wait();
    txConvert = await uniswap.swapExactETHForTokens(
      1,
      [
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      ],
      deployer.getAddress(),
      999999999999999,
      { value: ethers.utils.parseEther("10") }
    );
    await txConvert.wait();
    balance2 = await usdc.balanceOf(deployer.getAddress());
    console.log("jsbalance2", ethers.utils.formatUnits(balance2, 6));
    txApproveLoan = await usdc.approve(
      flashloan.address,
      ethers.utils.parseUnits("1000000000000000")
    );
    await txApproveLoan.wait();
    txApproveWeth = await aweth.approve(
      flashloan.address,
      ethers.utils.parseUnits("1000000000000000")
    );
    await txApproveWeth.wait();
    txDelegate = await usdcDebt.approveDelegation(
      flashloan.address,
      ethers.utils.parseUnits("1000000000000000")
    );
    await txDelegate.wait();
    txLoan = await flashloan.myFlashLoanCall(
      "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      "0x030bA81f1c18d280636F32af80b9AAd02Cf0854e",
      ethers.utils.parseUnits("2000", 6),
      0,
      "0x0000000000000000000000000000000000000000",
      0
    );
    await txLoan.wait();
    balance3 = await usdc.balanceOf(deployer.getAddress());
    console.log("jsbalance3", ethers.utils.formatUnits(balance3, 6));
    info = await lendingPool.getUserAccountData(deployer.getAddress());
    console.log(
      "totEthColl",
      ethers.utils.formatEther(info.totalCollateralETH)
    );
    console.log("totEthDebt", ethers.utils.formatEther(info.totalDebtETH));
    console.log(
      "avaBorrEth",
      ethers.utils.formatEther(info.availableBorrowsETH)
    );
    console.log(
      "currentLiquidationThreshold:",
      ethers.utils.formatEther(info.currentLiquidationThreshold)
    );
    console.log("ltv:", ethers.utils.formatEther(info.ltv));
    console.log("healthFactor:", ethers.utils.formatEther(info.healthFactor));
  });
  it("close long position", async function () {
    this.timeout(120000);
    // txApproveLoan = await aweth.approve(flashloan.address, ethers.utils.parseUnits("1000000000000000"));
    // await txApproveLoan.wait();
    closeLongAmount = await aweth.balanceOf(deployer.getAddress());
    repayAmount = await usdcDebt.balanceOf(deployer.getAddress());
    console.log("repayAmount", ethers.utils.formatUnits(repayAmount, 6));
    console.log("closeLongAmount", ethers.utils.formatUnits(closeLongAmount));
    txClose = await flashloan.myFlashLoanCall(
      "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      "0x030bA81f1c18d280636F32af80b9AAd02Cf0854e",
      repayAmount,
      1,
      "0x0000000000000000000000000000000000000000",
      closeLongAmount
    );
    balance3 = await usdc.balanceOf(deployer.getAddress());
    console.log("jsbalance3", ethers.utils.formatUnits(balance3, 6));
    info = await lendingPool.getUserAccountData(deployer.getAddress());
    console.log(
      "totEthColl",
      ethers.utils.formatEther(info.totalCollateralETH)
    );
    console.log("totEthDebt", ethers.utils.formatEther(info.totalDebtETH));
    console.log(
      "avaBorrEth",
      ethers.utils.formatEther(info.availableBorrowsETH)
    );
    console.log(
      "currentLiquidationThreshold:",
      ethers.utils.formatEther(info.currentLiquidationThreshold)
    );
    console.log("ltv:", ethers.utils.formatEther(info.ltv));
    console.log("healthFactor:", ethers.utils.formatEther(info.healthFactor));
  });
  it("open short position", async function () {
    balance3 = await usdc.balanceOf(deployer.getAddress());
    console.log("usdcbalance", ethers.utils.formatUnits(balance3, 6));
    txDelegate = await wethDebt.approveDelegation(
      flashloan.address,
      ethers.utils.parseUnits("1000000000000000")
    );
    await txDelegate.wait();
    txApprove = await weth.approve(
      flashloan.address,
      ethers.utils.parseEther("10000000")
    );
    await txApprove.wait();
    txShort = await flashloan.myFlashLoanCall(
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      "0x0000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000",
      ethers.utils.parseEther("2"),
      2,
      "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      ethers.utils.parseUnits("2000", 6)
    );
    await txShort.wait();
    balance3 = await usdc.balanceOf(deployer.getAddress());
    console.log("usdcbalance", ethers.utils.formatUnits(balance3, 6));
    info = await lendingPool.getUserAccountData(deployer.getAddress());
    console.log(
      "totEthColl",
      ethers.utils.formatEther(info.totalCollateralETH)
    );
    console.log("totEthDebt", ethers.utils.formatEther(info.totalDebtETH));
    console.log(
      "avaBorrEth",
      ethers.utils.formatEther(info.availableBorrowsETH)
    );
    console.log(
      "currentLiquidationThreshold:",
      ethers.utils.formatEther(info.currentLiquidationThreshold)
    );
    console.log("ltv:", ethers.utils.formatEther(info.ltv));
    console.log("healthFactor:", ethers.utils.formatEther(info.healthFactor));
  });
  it("close short position", async function () {});
});
