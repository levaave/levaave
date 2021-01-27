import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { abi as IErc20 } from "../abis/erc20.json";
// import { AAVELendingPoolAddressProviderAbi as IAddressProvider } from "../abis/AAVELendingPoolAddressProvider.js";
import { abi as IDataProvider } from "../abis/ProtocolDataProvider.json";
// import { abi as ILendingPool } from "../abis/LendingPool.json";

const Position = ({ signer }) => {
  // const POOL_ADDRESSES_PROVIDER_ADDRESS = "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5";
  const PROTOCOL_DATA_PROVIDER = "0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d";
  // const LENDING_POOL = "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9";
  // const addressProviderContract = new ethers.Contract(POOL_ADDRESSES_PROVIDER_ADDRESS, IAddressProvider, signer);
  const dataProviderContract = new ethers.Contract(PROTOCOL_DATA_PROVIDER, IDataProvider, signer);
  // const lendingPoolContract = new ethers.Contract(LENDING_POOL, ILendingPool, signer);
  const [reserveTokens, setReserveTokens] = useState();
  console.log("reserveTokens", reserveTokens);

  useEffect(() => {
    let array = [];
    dataProviderContract.getAllReservesTokens().then(r => {
      r.forEach((token, i) => {
        dataProviderContract.getReserveTokensAddresses(token.tokenAddress).then(z => {
          let token = {
            symbol: r[i].symbol,
            aTokensAddress: z.aTokenAddress,
            stableDebtTokenAddress: z.stableDebtTokenAddress,
            variableDebtTokenAddress: z.variableDebtTokenAddress,
          };
          array.push(token);
        });
      });
    });
    setReserveTokens(array);
  }, []);

  useEffect(() => {
    if (reserveTokens) {
      console.log("mmm");
      reserveTokens.forEach(token => {
        console.log("test");

        const aContract = new ethers.Contract(token.aTokenAddress, IErc20, signer);
        console.log("test");
        aContract.balanceOf(signer.provider.provider.selectedAddress).then(r => console.log(r));
      });
    }
  }, [reserveTokens]);

  return <></>;
};

export default Position;
