"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { BaseError, isAddress, parseUnits, zeroAddress } from "viem";
import type { Hash } from "viem";
import { useAccount } from "wagmi";
import { useDeployedContractInfo, useScaffoldWriteContract, useSelectedNetwork } from "~~/hooks/scaffold-eth";

export type CreateOrderProps = {
  /** Called after the createOrder transaction has been confirmed. */
  onSuccess?: (hash: Hash) => void;
};

export function CreateOrder({ onSuccess }: CreateOrderProps) {
  const { address, chainId } = useAccount();
  const network = useSelectedNetwork();
  const { data: token } = useDeployedContractInfo({ contractName: "LJXToken" });
  const { data: escrow } = useDeployedContractInfo({ contractName: "Escrow" });
  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "Escrow" });
  const [seller, setSeller] = useState("");
  const [amount, setAmount] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [transactionHash, setTransactionHash] = useState<Hash>();
  const submitting = useRef(false);
  const wrongNetwork = !!address && chainId !== network.id;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    setError("");
    setTransactionHash(undefined);

    const sellerAddress = seller.trim();
    if (!address || wrongNetwork || !token || !escrow) {
      setError("请连接钱包、切换到目标网络，并等待合约加载完成。");
      return;
    }
    if (!isAddress(sellerAddress) || sellerAddress.toLowerCase() === zeroAddress) {
      setError("请输入有效的非零卖家地址。");
      return;
    }
    if (sellerAddress.toLowerCase() === address.toLowerCase()) {
      setError("卖家不能是当前买家自己。");
      return;
    }
    // Reject excess precision instead of letting parseUnits round the amount.
    if (!/^\d+(\.\d{1,18})?$/.test(amount.trim())) {
      setError("金额须为正数，最多支持 18 位小数。");
      return;
    }
    const tokenAmount = parseUnits(amount.trim(), 18);
    if (tokenAmount <= 0n || tokenAmount >= 2n ** 256n) {
      setError("金额必须大于 0，且在合约支持的范围内。");
      return;
    }
    const duration = Number(minutes);
    const deadline = Math.floor(Date.now() / 1000) + duration * 60;
    if (
      !/^\d+$/.test(minutes.trim()) ||
      !Number.isSafeInteger(duration) ||
      duration <= 0 ||
      !Number.isSafeInteger(deadline)
    ) {
      setError("到期时间须为正整数分钟，且在支持的范围内。");
      return;
    }

    submitting.current = true;
    setPending(true);
    let confirmedHash: Hash | undefined;
    try {
      confirmedHash = await writeContractAsync(
        {
          functionName: "createOrder",
          args: [sellerAddress, token.address, tokenAmount, BigInt(deadline), description.trim()],
        },
        { blockConfirmations: 1 },
      );
      if (!confirmedHash) throw new Error("交易未发送，请检查钱包连接和网络后重试。");
      setTransactionHash(confirmedHash);
      setSeller("");
      setAmount("");
      setDescription("");
    } catch (cause) {
      setError(
        cause instanceof BaseError ? cause.shortMessage : cause instanceof Error ? cause.message : "创建订单失败。",
      );
    } finally {
      submitting.current = false;
      setPending(false);
    }
    if (confirmedHash) onSuccess?.(confirmedHash);
  };

  return (
    <form onSubmit={handleSubmit} className="card bg-base-100 shadow-md" aria-label="创建托管订单">
      <div className="card-body gap-4">
        <h2 className="card-title">创建订单</h2>
        <p className="m-0 text-sm">使用组长部署的代币，金额以“个”为单位。当前连接账户将作为买家。</p>
        <fieldset disabled={pending} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span>卖家地址</span>
            <input
              className="input input-bordered w-full"
              value={seller}
              onChange={e => setSeller(e.target.value)}
              placeholder="0x…"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>金额（个）</span>
            <input
              className="input input-bordered w-full"
              inputMode="decimal"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="30"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>多少分钟后到期</span>
            <input
              className="input input-bordered w-full"
              type="number"
              min="1"
              step="1"
              value={minutes}
              onChange={e => setMinutes(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>订单描述</span>
            <textarea
              className="textarea textarea-bordered w-full"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="页面订单"
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={!address || wrongNetwork || !token || !escrow}>
            {pending ? "等待钱包签名及链上确认…" : "创建订单"}
          </button>
        </fieldset>
        {!address && <p className="m-0 text-sm">请先连接 MetaMask 钱包。</p>}
        {wrongNetwork && <p className="m-0 text-warning">请将钱包切换到 {network.name}。</p>}
        {error && (
          <p role="alert" className="m-0 break-words text-error">
            {error}
          </p>
        )}
        {transactionHash && (
          <p role="status" className="m-0 break-all text-success">
            订单已创建。交易：{transactionHash}
          </p>
        )}
      </div>
    </form>
  );
}

export default CreateOrder;
