import { BigInt, Address } from "@graphprotocol/graph-ts";
import { TransactionSuccess } from "../generated/LevAave/LevAave";
import { Transaction, User } from "../generated/schema";

export function handleTransactionSuccess(event: TransactionSuccess): void {
  let userId = event.params.userAddress.toHexString();
  let transactions: Transaction[];
  // let leverageType = event.params.userAddress.toHexString();
  let user = User.load(userId);
  if (user == null) {
    user = new User(userId);
    user.address = event.params.userAddress.toString();
    // user.createdAt = event.block.timestamp;
  } else {
    // transactions = <Array<Transaction>>(<unknown>user.transactions);
  }
  addNewTransaction(userId, event);
  // transactions.push(newTransaction);
  // user.transactions = transactions;
  // user.save();
}

function addNewTransaction(
  userId: string,
  event: TransactionSuccess
): Transaction {
  let transaction = new Transaction("1");
  transaction.user = userId;
  transaction.leverageType = event.params.leverageType;
  transaction.leverageMultiplier = event.params.leverageMultiplier;
  transaction.isActive = true;
  transaction.debtTokenAddress = event.params.collateralTokenAddress.toHexString();
  transaction.debtValue = event.params.collateralAmount;
  transaction.leverageTokenAddress = event.params.leverageTokenAddress.toHexString();
  transaction.leverageValue = event.params.leverageAmount;
  // transaction.createdAt = event.block.timestamp;
  // transaction.modifiedAt = event.block.timestamp;
  transaction.save();
  return transaction;
}
// function getRandomInt(max: number): string {
//   return String(Math.floor(Number(Math.random() * max)));
// }
