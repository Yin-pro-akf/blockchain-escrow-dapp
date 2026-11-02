"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { BaseError, erc20Abi, getAddress, isAddress, parseUnits, publicActions, zeroAddress } from "viem";
import type { Hash } from "viem";
import { useAccount, useConfig } from "wagmi";
import { getAccount, getWalletClient } from "wagmi/actions";
import { useDeployedContractInfo, useScaffoldWriteContract, useSelectedNetwork } from "~~/hooks/scaffold-eth";

export type CreateOrderProps = {
  /** Called after the createOrder transaction has been confirmed. */
  onSuccess?: (hash: Hash) => void;
};

export function CreateOrder({ onSuccess }: CreateOrderProps) {
  const { address, chainId } = useAccount();
  const network = useSelectedNetwork();
  // escrow-lst-token-v1
  const config = useConfig();
  const [tokenAddress, setTokenAddress] = useState("");
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
    if (!address || wrongNetwork || !escrow) {
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
    const rawToken = tokenAddress.trim();
    if (!isAddress(rawToken) || rawToken.toLowerCase() === zeroAddress) {
      setError("请输入有效的非零代币合约地址。");
      return;
    }
    const paymentToken = getAddress(rawToken);
    if (!/^\d+(\.\d+)?$/.test(amount.trim())) {
      setError("金额须为正数，小数位数将按所选代币精度检查。");
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
      const wallet = await getWalletClient(config, { chainId: network.id });
      if (!wallet) throw new Error("请先连接钱包。");
      const client = wallet.extend(publicActions);
      const decimals = await client.readContract({
        address: paymentToken,
        abi: erc20Abi,
        functionName: "decimals",
      });
      if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
        throw new Error("代币返回了无效的精度。");
      }
      if ((amount.trim().split(".")[1]?.length ?? 0) > decimals) {
        throw new Error(`此代币最多支持 ${decimals} 位小数。`);
      }
      const tokenAmount = parseUnits(amount.trim(), decimals);
      if (tokenAmount <= 0n || tokenAmount >= 2n ** 256n) {
        throw new Error("金额必须大于 0，且在合约支持的范围内。");
      }
      const current = getAccount(config);
      if (current.address?.toLowerCase() !== address.toLowerCase() || current.chainId !== network.id) {
        throw new Error("账户或网络已改变，请切回原账户和网络后重试。");
      }
      confirmedHash = await writeContractAsync(
        {
          functionName: "createOrder",
          args: [sellerAddress, paymentToken, tokenAmount, BigInt(deadline), description.trim()],
        },
        { blockConfirmations: 1 },
      );
      if (!confirmedHash) throw new Error("交易未发送，请检查钱包连接和网络后重试。");
      setTransactionHash(confirmedHash);
      window.dispatchEvent(new CustomEvent("escrow:receipt-confirmed", {
        detail: { chainId: network.id, address: escrow.address, hash: confirmedHash },
      }));
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
        <p className="m-0 text-sm">请输入你持有的 ERC20 代币合约地址。金额以“个”为单位，当前连接账户将作为买家。</p>
        <fieldset disabled={pending} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span>付款代币合约地址</span>
            <input
              className="input input-bordered w-full font-mono"
              value={tokenAddress}
              onChange={e => setTokenAddress(e.target.value)}
              placeholder="0x…"
              required
            />
            <span className="text-xs text-base-content/60">请填写代币合约地址；创建后该订单的代币地址不能修改。</span>
          </label>
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
          <button type="submit" className="btn btn-primary" disabled={!address || wrongNetwork || !escrow}>
            {pending ? "正在读取代币精度或等待钱包及链上确认…" : "创建订单"}
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
