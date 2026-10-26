"use client";

import { useAccount } from "wagmi";
import { isAddress, isAddressEqual, type Address } from "viem";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

/** 与 Escrow.Status 的声明顺序一致。 */
export const ORDER_STATUS = {
  Created: 0,
  Paid: 1,
  Completed: 2,
  Refunded: 3,
  Disputed: 4,
} as const;

export type OrderRole = "buyer" | "seller" | "arbiter" | "spectator";

export const ORDER_ROLE_LABEL: Record<OrderRole, string> = {
  buyer: "买家",
  seller: "卖家",
  arbiter: "仲裁人",
  spectator: "旁观者",
};

export type OrderParties = {
  buyer?: string | null;
  seller?: string | null;
};

const sameAddress = (left?: string | null, right?: string | null) => {
  if (!left || !right || !isAddress(left) || !isAddress(right)) return false;
  return isAddressEqual(left, right);
};

/**
 * 按某一笔订单判断当前连接账户的角色。
 * 先看是不是该订单的买家或卖家，再看是不是合约仲裁人，否则是旁观者。
 * 不传 buyer / seller 时，只能区分仲裁人和旁观者。
 */
export const useOrderRole = (parties?: OrderParties) => {
  const { address } = useAccount();
  const { data: arbiter } = useScaffoldReadContract({
    contractName: "Escrow",
    functionName: "arbiter",
  });

  const arbiterAddress = typeof arbiter === "string" ? (arbiter as Address) : undefined;
  const isBuyer = sameAddress(address, parties?.buyer);
  const isSeller = sameAddress(address, parties?.seller);
  const isArbiter = sameAddress(address, arbiterAddress);

  let role: OrderRole = "spectator";
  if (isBuyer) role = "buyer";
  else if (isSeller) role = "seller";
  else if (isArbiter) role = "arbiter";

  return {
    address,
    arbiter: arbiterAddress,
    role,
    roleLabel: ORDER_ROLE_LABEL[role],
    isBuyer,
    isSeller,
    isArbiter,
    isConnected: Boolean(address),
  };
};
