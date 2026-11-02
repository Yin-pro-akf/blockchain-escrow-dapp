"use client";

import { useEffect, useRef, useState } from "react";
import { decodeEventLog, erc20Abi, publicActions } from "viem";
import type { Hash } from "viem";
import { useAccount, useConfig } from "wagmi";
import { getAccount, getWalletClient } from "wagmi/actions";
import { useDeployedContractInfo, useScaffoldReadContract, useSelectedNetwork } from "~~/hooks/scaffold-eth";

export type OrderActionsProps = { id: bigint; onSuccess?: (hash: Hash) => void };
type Action = "deposit" | "confirm";
type Kind = Action | "approve";
type SavedTransaction = { kind: Kind; hash: Hash };

function loadTransaction(key: string): SavedTransaction | undefined {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    if (value && ["approve", "deposit", "confirm"].includes(value.kind) && /^0x[0-9a-f]{64}$/i.test(value.hash)) return value;
  } catch { /* The current click can still check the on-chain order. */ }
  return undefined;
}

function errorDetail(error: unknown): string {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  const visit = (value: unknown, depth = 0) => {
    if (!value || typeof value !== "object" || seen.has(value) || depth > 5) return;
    seen.add(value);
    const entry = value as Record<string, unknown>;
    for (const key of ["shortMessage", "reason", "details", "message"]) {
      if (typeof entry[key] === "string" && entry[key]) parts.push(entry[key]);
    }
    visit(entry.cause, depth + 1);
    visit(entry.data, depth + 1);
    visit(entry.originalError, depth + 1);
  };
  visit(error);
  if (!parts.length) return error instanceof Error ? error.message : String(error);
  return [...new Set(parts)].join("\n");
}

// escrow-payment-receipts-v2
export function OrderActions({ id, onSuccess }: OrderActionsProps) {
  const { address, chainId } = useAccount();
  const config = useConfig();
  const network = useSelectedNetwork();
  const { data: escrow } = useDeployedContractInfo({ contractName: "Escrow" });
  const { data: order, refetch, isLoading, error: readError } = useScaffoldReadContract({
    contractName: "Escrow", functionName: "getOrder", args: [id],
  });
  const [pending, setPending] = useState<Action>();
  const [saved, setSaved] = useState<SavedTransaction>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastHash, setLastHash] = useState<Hash>();
  const [storageWarning, setStorageWarning] = useState("");
  const submitting = useRef(false);
  const key = `escrow-action-v2:${network.id}:${escrow?.address.toLowerCase()}:${address?.toLowerCase()}:${id}`;
  useEffect(() => { setSaved(loadTransaction(key)); setLastHash(undefined); setError(""); }, [key]);

  const isBuyer = !!address && address.toLowerCase() === order?.buyer.toLowerCase();
  const wrongNetwork = !!address && chainId !== network.id;
  const canPay = isBuyer && order !== undefined && Number(order.status) === 0;
  const canConfirm = isBuyer && order !== undefined && Number(order.status) === 1;
  const disabled = pending !== undefined || wrongNetwork || !escrow;

  const handleAction = async (action: Action) => {
    if (submitting.current || !address || !escrow || wrongNetwork) return;
    submitting.current = true;
    setPending(action);
    setError("");
    setStorageWarning("");
    let phase = "连接钱包";
    let sent: SavedTransaction | undefined;
    const stage = (label: string) => { phase = label; setMessage(label + "…"); };
    const remember = (value?: SavedTransaction) => {
      setSaved(value);
      try {
        if (value) localStorage.setItem(key, JSON.stringify(value));
        else localStorage.removeItem(key);
      } catch {
        setStorageWarning("浏览器未能保存交易记录，请保留下面的交易哈希。");
      }
    };
    const ensureAccount = () => {
      const current = getAccount(config);
      if (current.address?.toLowerCase() !== address.toLowerCase() || current.chainId !== network.id) {
        throw new Error("钱包账户或网络已变化，请切回本次操作的账户和网络。");
      }
    };
    try {
      ensureAccount();
      const wallet = await getWalletClient(config, { chainId: network.id });
      // Use the connected wallet's RPC for reads, simulations and receipts.
      const rpc = wallet.extend(publicActions);
      const finish = async (transaction: SavedTransaction) => {
        sent = transaction;
        setLastHash(transaction.hash);
        stage(transaction.kind === "approve" ? "等待授权交易确认" : transaction.kind === "deposit" ? "等待付款交易确认" : "等待确认收货交易确认");
        const receipt = await rpc.waitForTransactionReceipt({
          hash: transaction.hash, confirmations: 1, timeout: 120000, pollingInterval: 2000,
        });
        ensureAccount();
        setLastHash(receipt.transactionHash);
        if (receipt.status !== "success") {
          remember();
          sent = undefined;
          throw new Error("交易已上链但执行失败，请查看钱包中的失败原因。");
        }
        if (transaction.kind === "approve") {
          remember();
          sent = undefined;
          return;
        }
        const expected = transaction.kind === "deposit" ? "OrderPaid" : "OrderCompleted";
        let matched = false;
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() !== escrow.address.toLowerCase()) continue;
          try {
            const decoded = decodeEventLog({ abi: escrow.abi, data: log.data, topics: log.topics, strict: true });
            const args = decoded.args as { id?: bigint } | undefined;
            if (decoded.eventName === expected && args?.id === id) matched = true;
          } catch { /* Other logs in this receipt may belong to another event. */ }
        }
        remember();
        sent = undefined;
        window.dispatchEvent(new CustomEvent("escrow:receipt-confirmed", {
          detail: { chainId: network.id, address: escrow.address, hash: receipt.transactionHash },
        }));
        if (!matched) {
          throw new Error(`交易已确认，但回执没有订单 #${id} 的 ${expected}，请用交易哈希核对；暂未将其标为操作成功。`);
        }
        setMessage(`${transaction.kind === "deposit" ? "付款" : "确认收货"}已确认。交易：${receipt.transactionHash}`);
        try { onSuccess?.(receipt.transactionHash); } catch (callbackError) { console.error(callbackError); }
      };

      // A timeout after sending a transaction must never trigger a blind resend.
      const previous = loadTransaction(key) ?? saved;
      if (previous) {
        await finish(previous);
        if (previous.kind !== "approve") return;
      }

      stage("读取订单最新状态");
      const currentOrder = await rpc.readContract({ address: escrow.address, abi: escrow.abi, functionName: "getOrder", args: [id] });
      if (currentOrder.buyer.toLowerCase() !== address.toLowerCase()) throw new Error("当前账户不是该订单的买家。");
      const expectedStatus = action === "deposit" ? 0 : 1;
      if (Number(currentOrder.status) !== expectedStatus) {
        throw new Error(`订单当前状态为 ${Number(currentOrder.status)}，不符合本次操作条件；已请求刷新订单。`);
      }

      if (action === "deposit") {
        stage("检查代币余额和授权额度");
        const [balance, allowance] = await Promise.all([
          rpc.readContract({ address: currentOrder.token, abi: erc20Abi, functionName: "balanceOf", args: [address] }),
          rpc.readContract({ address: currentOrder.token, abi: erc20Abi, functionName: "allowance", args: [address, escrow.address] }),
        ]);
        if (balance < currentOrder.amount) throw new Error("代币余额不足，无法支付该订单金额。");
        if (allowance < currentOrder.amount) {
          stage("模拟代币授权");
          const simulation = await rpc.simulateContract({
            address: currentOrder.token, abi: erc20Abi, functionName: "approve",
            args: [escrow.address, currentOrder.amount], account: address,
          });
          if (simulation.result === false) throw new Error("代币合约拒绝授权。");
          ensureAccount();
          stage("请在钱包确认代币授权");
          const hash = await wallet.writeContract(simulation.request);
          const transaction: SavedTransaction = { kind: "approve", hash };
          sent = transaction;
          remember(transaction);
          await finish(transaction);
          stage("核对授权额度");
          const verified = await rpc.readContract({
            address: currentOrder.token, abi: erc20Abi, functionName: "allowance", args: [address, escrow.address],
          });
          if (verified < currentOrder.amount) throw new Error("授权交易已确认，但授权额度仍不足，付款尚未发送。");
        }
      }

      ensureAccount();
      stage(action === "deposit" ? "模拟订单付款" : "模拟确认收货");
      const simulation = await rpc.simulateContract({
        address: escrow.address, abi: escrow.abi, functionName: action, args: [id], account: address,
      });
      ensureAccount();
      stage(action === "deposit" ? "请在钱包确认订单付款" : "请在钱包确认收货");
      const hash = await wallet.writeContract(simulation.request);
      const transaction: SavedTransaction = { kind: action, hash };
      sent = transaction;
      remember(transaction);
      await finish(transaction);
    } catch (cause) {
      setMessage("");
      const detail = errorDetail(cause);
      setError(`[${phase}] ${detail}${sent ? `\n已发送交易：${sent.hash}\n请点击“核对上次交易”继续检查回执。` : ""}`);
    } finally {
      submitting.current = false;
      setPending(undefined);
      void refetch().catch(() => undefined);
    }
  };

  if (isLoading) return <p role="status" className="text-sm">正在加载订单操作…</p>;
  if (readError || !order) return <p role="alert" className="text-error">无法读取订单，请检查订单编号和网络。</p>;

  return (
    <div className="flex flex-col gap-2" aria-label={`订单 ${id.toString()} 操作`}>
      <div className="flex flex-wrap gap-2">
        {saved ? (
          <button type="button" className="btn btn-primary btn-sm" disabled={disabled}
            onClick={() => void handleAction(saved.kind === "confirm" ? "confirm" : "deposit")}>
            {pending ? "正在核对…" : "核对上次交易"}
          </button>
        ) : <>
          {canPay && <button type="button" className="btn btn-primary btn-sm" disabled={disabled}
            onClick={() => void handleAction("deposit")}>{pending ? "处理中…" : "付款"}</button>}
          {canConfirm && <button type="button" className="btn btn-success btn-sm" disabled={disabled}
            onClick={() => void handleAction("confirm")}>{pending ? "处理中…" : "确认收货"}</button>}
        </>}
      </div>
      {!address && <p className="m-0 text-sm">请连接钱包查看可用操作。</p>}
      {wrongNetwork && <p className="m-0 text-sm text-warning">请将钱包切换到 {network.name}。</p>}
      {address && !canPay && !canConfirm && !saved && <p className="m-0 text-sm">当前账户暂无可执行操作。</p>}
      {message && <p role="status" aria-live="polite" className="m-0 break-all text-sm">{message}</p>}
      {lastHash && <p className="m-0 break-all text-xs">最近交易：{lastHash}</p>}
      {storageWarning && <p className="m-0 text-sm text-warning">{storageWarning}</p>}
      {error && <p role="alert" className="m-0 whitespace-pre-wrap break-words text-sm text-error">{error}</p>}
    </div>
  );
}

export default OrderActions;
