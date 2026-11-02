"use client";

import { useEffect, useRef, useState } from "react";
import deployedContracts from "~~/contracts/deployedContracts";

const CHAIN = 60600;
const ADDRESS = deployedContracts[60600].Escrow.address.toLowerCase();
const KNOWN_ADDRESS = "0xdc0f0ad6580cf7ef2227f48abfc65e8700f2ad73";
const CACHE_KEY = `escrow-receipts-v1:${CHAIN}:${ADDRESS}`;
const SEEDS = ADDRESS === KNOWN_ADDRESS ? [
  "0x78cd02969654f38042cac9ab25b4f396033c8a932fba14d2d7b758acfa8cd21a",
  "0xff1dee2632c7156f9d959891d8b16e16390c18c8002d782a6e719da6bec4c08c",
] : [];

// These selectors match the six events in this project's Escrow ABI.
// Each event has uint256 indexed id as topics[1].
const TOPICS: Record<string, string> = {
  "0xa4be1e061958d160de04db54668a64922c36d2765b16644ae91acf127708970e": "OrderCreated",
  "0x15e33efda35e5da2fb096ba49585307ba468af144aea691da964aaff1a7f3a57": "OrderPaid",
  "0x02a7d4d9472af7118644884b9a0ee443540c0027e938dd0aa35be8ecbe946c0a": "OrderCompleted",
  "0x303a31648d19f17852cf82657162c4bdd4a06ab3f36f1e7ae1118f4ca6473e11": "OrderRefunded",
  "0xde481be1936299e9233634e9f3cd92028f797634de15defa790fb2d7a013c95a": "OrderDisputed",
  "0x649ff37700d4eb8a5bc86ef06a55183597fa5c3c6b53ec4b9ee510cb2089ee26": "OrderResolved",
};

export type ReceiptTimelineEvent = {
  eventName: string;
  blockNumber: bigint;
  transactionHash: `0x${string}`;
  id: bigint;
  logIndex: number;
};
type Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};
const record = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
const isHash = (value: unknown): value is `0x${string}` =>
  typeof value === "string" && /^0x[0-9a-f]{64}$/i.test(value);
const message = (error: unknown) => error instanceof Error ? error.message : String(error);

export function eventsFromReceipt(value: unknown, hash: string): ReceiptTimelineEvent[] {
  if (!isHash(hash)) throw new Error("交易哈希格式不正确");
  const receipt = record(value);
  if (!receipt) throw new Error("交易回执尚未返回，请稍后重试");
  if (String(receipt.transactionHash).toLowerCase() !== hash.toLowerCase()) {
    throw new Error("回执交易哈希不匹配");
  }
  if (receipt.status === "0x0") return [];
  if (receipt.status !== "0x1") throw new Error("回执状态无法确认");
  if (typeof receipt.blockNumber !== "string" || !/^0x[0-9a-f]+$/i.test(receipt.blockNumber)) {
    throw new Error("回执缺少有效区块号");
  }
  if (!Array.isArray(receipt.logs)) throw new Error("回执缺少日志数组");
  const events: ReceiptTimelineEvent[] = [];
  for (const raw of receipt.logs) {
    const log = record(raw);
    if (!log || log.removed === true || String(log.address).toLowerCase() !== ADDRESS) continue;
    if (!Array.isArray(log.topics) || !isHash(log.topics[0]) || !isHash(log.topics[1])) continue;
    const eventName = TOPICS[log.topics[0].toLowerCase()];
    if (!eventName) continue;
    if (typeof log.logIndex !== "string" || !/^0x[0-9a-f]+$/i.test(log.logIndex)) {
      throw new Error("事件日志序号无效");
    }
    events.push({
      eventName,
      id: BigInt(log.topics[1]),
      blockNumber: BigInt(receipt.blockNumber),
      transactionHash: hash,
      logIndex: Number(BigInt(log.logIndex)),
    });
  }
  return events;
}

export function useReceiptTimeline() {
  const [events, setEvents] = useState<ReceiptTimelineEvent[]>([]);
  const [status, setStatus] = useState("正在连接钱包读取回执…");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const reader = useRef<((hash: string) => Promise<number>) | null>(null);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const provider = (window as unknown as { ethereum?: Provider }).ethereum;
    const hashes = new Set<string>();
    const collected = new Map<string, ReceiptTimelineEvent>();
    let cursor: bigint | null = null;
    let savedCursor: bigint | null = null;
    let missedHistory = false;
    let storageFailed = false;
    setEvents([]);
    setReady(false);
    setError("");
    reader.current = null;

    const persist = () => {
      if (stopped) return;
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          version: 1, hashes: [...hashes], cursor: (cursor ?? savedCursor)?.toString() ?? null,
        }));
      } catch { storageFailed = true; }
    };
    const checkChain = async () => {
      if (!provider) throw new Error("请连接 MetaMask 后点击重新连接");
      const chain = await provider.request({ method: "eth_chainId" });
      if (Number(chain) !== CHAIN) throw new Error("请将 MetaMask 切换到 Chain ID 60600");
    };
    const readOne = async (hash: string): Promise<number> => {
      if (stopped) throw new Error("连接已更新，请重试");
      if (!isHash(hash)) throw new Error("请输入完整的 0x 开头交易哈希");
      await checkChain();
      const receipt = await provider!.request({ method: "eth_getTransactionReceipt", params: [hash] });
      const found = eventsFromReceipt(receipt, hash);
      if (stopped) return 0;
      if (found.length) {
        hashes.add(hash.toLowerCase());
        for (const event of found) collected.set(`${hash.toLowerCase()}:${event.logIndex}`, event);
        setEvents([...collected.values()].sort((a, b) =>
          a.blockNumber < b.blockNumber ? -1 : a.blockNumber > b.blockNumber ? 1 : a.logIndex - b.logIndex,
        ));
        persist();
      }
      return found.length;
    };

    const poll = async () => {
      try {
        await checkChain();
        if (stopped) return;
        const headValue = await provider!.request({ method: "eth_blockNumber" });
        if (typeof headValue !== "string" || !/^0x[0-9a-f]+$/i.test(headValue)) throw new Error("节点区块号无效");
        const head = BigInt(headValue);
        if (cursor === null) {
          if (savedCursor !== null && savedCursor <= head && head - savedCursor <= 120n) cursor = savedCursor;
          else {
            missedHistory = savedCursor !== null && head - savedCursor > 120n;
            cursor = head > 2n ? head - 2n : -1n;
          }
        }
        // Read a bounded number of blocks each turn. Never checkpoint a block
        // until all matching transaction receipts have been read successfully.
        for (let count = 0; cursor < head && count < 12 && !stopped; count++) {
          const next = cursor + 1n;
          const block = record(await provider!.request({
            method: "eth_getBlockByNumber", params: ["0x" + next.toString(16), true],
          }));
          if (!block || !Array.isArray(block.transactions)) throw new Error("区块交易尚未返回，正在重试");
          for (const raw of block.transactions) {
            const tx = record(raw);
            if (!tx) throw new Error("节点没有返回完整区块交易，无法安全更新进度");
            if (String(tx.to).toLowerCase() !== ADDRESS) continue;
            if (!isHash(tx.hash)) throw new Error("区块中的交易哈希无效");
            await readOne(tx.hash);
          }
          if (stopped) return;
          cursor = next;
          persist();
        }
        if (!stopped) {
          setError("");
          const note = storageFailed ? "；浏览器保存失败，刷新后请重新导入" : missedHistory ? "；较早离线交易可用哈希导入" : "";
          setStatus(`已核对至区块 ${cursor}，正在监测新交易${note}`);
        }
      } catch (reason) {
        if (!stopped) setError(message(reason));
      } finally {
        if (!stopped) timer = setTimeout(poll, 4000);
      }
    };

    const onConfirmedReceipt = (event: Event) => {
      const detail = record((event as CustomEvent<unknown>).detail);
      if (!detail || Number(detail.chainId) !== CHAIN || String(detail.address).toLowerCase() !== ADDRESS || !isHash(detail.hash)) return;
      void readOne(detail.hash).catch(reason => { if (!stopped) setError(message(reason)); });
    };
    window.addEventListener("escrow:receipt-confirmed", onConfirmedReceipt);

    const start = async () => {
      try {
        await checkChain();
        if (stopped) return;
        reader.current = readOne;
        setReady(true);
        let cachedHashes: string[] = [];
        try {
          const saved = record(JSON.parse(localStorage.getItem(CACHE_KEY) || "null"));
          if (saved && Array.isArray(saved.hashes)) cachedHashes = saved.hashes.filter(isHash);
          if (saved && typeof saved.cursor === "string" && /^\d+$/.test(saved.cursor)) savedCursor = BigInt(saved.cursor);
        } catch { /* Reconstruct verified records from known receipts. */ }
        const restore = [...new Set([...SEEDS, ...cachedHashes])];
        for (const hash of cachedHashes) hashes.add(hash.toLowerCase());
        let failures = 0;
        for (let i = 0; i < restore.length && !stopped; i++) {
          setStatus(`正在恢复交易回执 ${i + 1}/${restore.length}`);
          try { await readOne(restore[i]); } catch { failures++; }
        }
        if (!stopped && failures) setError(`${failures} 笔缓存交易未恢复，可点击重新连接重试`);
      } catch (reason) {
        if (!stopped) setError(message(reason));
      }
      if (!stopped) void poll();
    };
    void start();
    return () => {
      stopped = true;
      window.removeEventListener("escrow:receipt-confirmed", onConfirmedReceipt);
      if (timer) clearTimeout(timer);
      if (reader.current === readOne) reader.current = null;
    };
  }, [restartKey]);

  return {
    events, status, error, ready,
    restart: () => setRestartKey(value => value + 1),
    importTransaction: async (hash: string) => {
      if (!reader.current) throw new Error("钱包连接尚未就绪，请切换网络后点重新连接");
      return reader.current(hash);
    },
  };
}

export type ReceiptTimelineState = ReturnType<typeof useReceiptTimeline>;
