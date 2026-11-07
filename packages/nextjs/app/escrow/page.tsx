"use client";

import type { NextPage } from "next";
import { useAccount, useSwitchChain } from "wagmi";
import { useDeployedContractInfo, useSelectedNetwork } from "~~/hooks/scaffold-eth";
import { CreateOrder } from "./_components/CreateOrder";
import { OrderList } from "./_components/OrderList";

const Escrow: NextPage = () => {
  const network = useSelectedNetwork();
  const { address, chainId } = useAccount();
  const { switchChain, isPending, error } = useSwitchChain();
  const { data: escrow } = useDeployedContractInfo({ contractName: "Escrow" });
  const { data: token } = useDeployedContractInfo({ contractName: "PWQToken" });
  const wrongNetwork = !!address && chainId !== network.id;
  return (
    <div className="flex flex-col items-center grow pt-8 px-5">
      <h1 className="text-3xl font-bold mb-6">托管交易</h1>
      <div className="flex flex-col gap-6 w-full max-w-5xl">
        <div className="rounded-box bg-base-200 p-4 text-sm break-all">
          <p>交易网络：{network.name}（Chain ID {network.id}）</p>
          <p>Escrow：{escrow?.address ?? "加载中…"}</p>
          <p>PWQToken：{token?.address ?? "加载中…"}</p>
          {wrongNetwork && (
            <button
              type="button"
              className="btn btn-warning btn-sm"
              disabled={isPending}
              onClick={() => switchChain({ chainId: network.id })}
            >
              切换到 {network.name}
            </button>
          )}
          {error && <p role="alert" className="text-error">{error.message}</p>}
        </div>
        {/* 刘：创建订单 */}
        <CreateOrder />
        {/* 雯青：订单列表与读数据（内部集成刘的付款/确认和林的角色判断/争议仲裁） */}
        <OrderList />
      </div>
    </div>
  );
};

export default Escrow;
