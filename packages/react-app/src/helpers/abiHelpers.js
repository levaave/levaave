// import { AAVELendingPoolAddressProviderAbi } from "../abis/AAVELendingPoolAddressProvider";
// import { ethers } from "ethers";

export async function getListOfTokensSupportedByAAVE(contract) {
  try {
    const response = await contract.getAllReservesTokens();
    return response;
  } catch (e) {
    console.log(e);
  }
}

// for 1inch tokens

// const getApprove1inchData = async (tokenAddress) => {
//   try {
//     const oneInchAproveDataUrl = `https://api.1inch.exchange/v2.0/approve/calldata?infinity=true&tokenAddress=${tokenAddress}`;
//     const jsonRequest = { inifinity: true, tokenAddress };
//     const request = new Request(oneInchAproveDataUrl, {
//       method: 'GET',
//       headers: {
//         Accept: 'application/json',
//         'Content-Type': 'application/json',
//       },
//     });
//   } catch (error) {
//     console.log(

export const getApprove1inchData = async tokenAddress => {
  try {
    const oneInchAproveDataUrl = `https://api.1inch.exchange/v2.0/approve/calldata?infinity=true&tokenAddress=${tokenAddress}`;
    const request = new Request(oneInchAproveDataUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        // "Access-Control-Allow-Origin": "*"
      },
    });
    let response = await fetch(request);
    return response.json();
  } catch (error) {
    console.log("error in getApprove1incData", error);
  }
};

export const get1InchQuote = async (fromTokenAddress, toTokenAddress, amount) => {
  try {
    const oneInchAproveDataUrl = `https://api.1inch.exchange/v2.0/quote?fromTokenAddress=${fromTokenAddress}&toTokenAddress=${toTokenAddress}&amount=${amount}`;
    const request = new Request(oneInchAproveDataUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        // "Access-Control-Allow-Origin": "*"
      },
    });
    let response = await fetch(request);
    return response.json();
  } catch (error) {
    console.log("error in getApprove1incData", error);
  }
};

export const get1InchSwapData = async (
  fromTokenAddress,
  toTokenAddress,
  amount,
  fromAddress,
  maxSlippagePercentage,
) => {
  try {
    const oneInchAproveDataUrl = `https://api.1inch.exchange/v2.0/swap?fromTokenAddress=${fromTokenAddress}&toTokenAddress=${toTokenAddress}&amount=${amount}&fromAddress=${fromAddress}&slippage=${maxSlippagePercentage}&disableEstimate=true`;
    const request = new Request(oneInchAproveDataUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        // "Access-Control-Allow-Origin": "*"
      },
    });
    let response = await fetch(request);
    return response.json();
  } catch (error) {
    console.log("error in getApprove1incData", error);
  }
};
