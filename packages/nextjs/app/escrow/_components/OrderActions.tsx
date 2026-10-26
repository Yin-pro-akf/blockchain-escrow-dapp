"use client";

import { useRef, useState } from "react";
import { BaseError, erc20Abi } from "viem";
import type { Hash } from "viem";
import { useAccount, useConfig, useWriteContract } from "wagmi";
import { getAccount } from "wagmi/actions";
import {
  useDeployedContractInfo,
  useScaffoldReadContract,
  useScaffoldWriteContract,
  useSelectedNetwork,
  useTransactor,
} from "~~/hooks/scaffold-eth";

export type OrderActionsProps = {
  /** The on-chain order id, e.g. <OrderActions id={0n} />. */
  id: bigint;
  /** Called after an order-changing transaction has been confirmed. */
  onSuccess?: (hash: Hash) => void;
};

type Action = "deposit" | "confirm" | "dispute" | "sellerWins" | "buyerWins";

export function OrderActions({ id, onSuccess }: OrderActionsProps) {
  const { address, chainId } = useAccount();
  const config = useConfig();
  const network = useSelectedNetwork();
  const { data: escrow } = useDeployedContractInfo({ contractName: "Escrow" });
  const {
    data: order,
    refetch,
    isLoading,
    error: readError,
  } = useScaffoldReadContract({
    contractName: "Escrow",
    functionName: "getOrder",
    args: [id],
  });
  const { data: arbiter } = useScaffoldReadContract({ contractName: "Escrow", functionName: "arbiter" });
  const { writeContractAsync: writeEscrow } = useScaffoldWriteContract({ contractName: "Escrow" });
  const { writeContractAsync: writeToken } = useWriteContract();
  const transact = useTransactor();
  const [pending, setPending] = useState<Action>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const submitting = useRef(false);

  const isBuyer = !!address && address.toLowerCase() === order?.buyer.toLowerCase();
  const isSeller = !!address && address.toLowerCase() === order?.seller.toLowerCase();
  const isArbiter = !!address && address.toLowerCase() === arbiter?.toLowerCase();
  const wrongNetwork = !!address && chainId !== network.id;
  const canPay = isBuyer && order?.status === 0;
  const canConfirm = isBuyer && order?.status === 1;
  const canDispute = (isBuyer || isSeller) && order?.status === 1;
  const canResolve = isArbiter && order?.status === 4;
  const disabled = pending !== undefined || wrongNetwork || !escrow;

  const handleAction = async (action: Action) => {
    if (submitting.current || !address || !order || !escrow || wrongNetwork) return;
    const permitted =
      action === "deposit"
        ? canPay
        : action === "confirm"
          ? canConfirm
          : action === "dispute"
            ? canDispute
            : canResolve;
    if (!permitted) return;

    submitting.current = true;
    setPending(action);
    setError("");
    setMessage("");
    let confirmedHash: Hash | undefined;
    try {
      if (action === "deposit") {
        setMessage("第 1/2 步：请在钱包中授权，等待授权交易确认…");
        // Authorize the token stored in this order, not a hardcoded token address.
        // useTransactor resolves only after a successful transaction receipt.
        const approvalHash = await transact(
          () =>
            writeToken({
              address: order.token,
              abi: erc20Abi,
              functionName: "approve",
              args: [escrow.address, order.amount],
              chainId: network.id,
              account: address,
            }),
          { blockConfirmations: 1 },
        );
        if (!approvalHash) throw new Error("授权交易未发送，付款已停止。");

        // Recheck after the approval wait: a user may have changed accounts/networks.
        const currentAccount = getAccount(config);
        if (currentAccount.address?.toLowerCase() !== address.toLowerCase() || currentAccount.chainId !== network.id) {
          throw new Error("授权已确认，但钱包账户或网络发生变化。请切回原账户和网络后重新付款。");
        }
        setMessage("第 2/2 步：授权已确认，请在钱包中确认付款…");
        confirmedHash = await writeEscrow({ functionName: "deposit", args: [id] }, { blockConfirmations: 1 });
      } else if (action === "sellerWins" || action === "buyerWins") {
        setMessage("请在钱包中签名，等待仲裁交易确认…");
        confirmedHash = await writeEscrow(
          { functionName: "resolve", args: [id, action === "sellerWins"] },
          { blockConfirmations: 1 },
        );
      } else {
        setMessage("请在钱包中签名，等待交易确认…");
        confirmedHash = await writeEscrow({ functionName: action, args: [id] }, { blockConfirmations: 1 });
      }
      if (!confirmedHash) throw new Error("交易未发送，请检查钱包连接和网络后重试。");
      setMessage(`操作已确认。交易：${confirmedHash}`);
    } catch (cause) {
      setMessage("");
      const detail =
        cause instanceof BaseError ? cause.shortMessage : cause instanceof Error ? cause.message : "操作失败，请重试。";
      setError(action === "deposit" ? `${detail} 若授权已成功，订单仍需完成付款；授权不会自动扣款。` : detail);
    } finally {
      // Refresh even after a failure in case another participant changed the order.
      await refetch().catch(() => undefined);
      submitting.current = false;
      setPending(undefined);
    }
    if (confirmedHash) onSuccess?.(confirmedHash);
  };

  if (isLoading)
    return (
      <p role="status" className="text-sm">
        正在加载订单操作…
      </p>
    );
  if (readError || !order)
    return (
      <p role="alert" className="text-error">
        无法读取订单，请检查订单编号和网络。
      </p>
    );

  return (
    <div className="flex flex-col gap-2" aria-label={`订单 ${id.toString()} 操作`}>
      <div className="flex flex-wrap gap-2">
        {canPay && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={disabled}
            onClick={() => handleAction("deposit")}
          >
            付款
          </button>
        )}
        {canConfirm && (
          <button
            type="button"
            className="btn btn-success btn-sm"
            disabled={disabled}
            onClick={() => handleAction("confirm")}
          >
            确认收货
          </button>
        )}
        {canDispute && (
          <button
            type="button"
            className="btn btn-warning btn-sm"
            disabled={disabled}
            onClick={() => handleAction("dispute")}
          >
            发起争议
          </button>
        )}
        {canResolve && (
          <>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={disabled}
              onClick={() => handleAction("sellerWins")}
            >
              判给卖家
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={disabled}
              onClick={() => handleAction("buyerWins")}
            >
              退给买家
            </button>
          </>
        )}
      </div>
      {!address && <p className="m-0 text-sm">请连接钱包查看可用操作。</p>}
      {wrongNetwork && <p className="m-0 text-sm text-warning">请将钱包切换到 {network.name}。</p>}
      {address && !canPay && !canConfirm && !canDispute && !canResolve && (
        <p className="m-0 text-sm">当前账户暂无可执行操作。</p>
      )}
      {message && (
        <p role="status" aria-live="polite" className="m-0 break-all text-sm">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="m-0 break-words text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}

export default OrderActions;
