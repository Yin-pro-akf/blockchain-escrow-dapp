"use client";

import { erc20Abi, formatUnits } from "viem";
import { useReadContract } from "wagmi";
import { useSelectedNetwork } from "~~/hooks/scaffold-eth";

export function OrderTokenAmount({ tokenAddress, value }: { tokenAddress: `0x${string}`; value: bigint }) {
  const network = useSelectedNetwork();
  const { data: decimals, isError } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "decimals",
    chainId: network.id,
    query: { staleTime: 300000 },
  });
  if (decimals === undefined) return <span>{isError ? `${value.toString()}（最小单位，代币精度读取失败）` : "读取代币精度…"}</span>;
  return <span className="font-mono">{formatUnits(value, decimals)}</span>;
}
