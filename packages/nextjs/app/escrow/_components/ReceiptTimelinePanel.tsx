"use client";

import { useState } from "react";
import type { ReceiptTimelineState } from "./useReceiptTimeline";

export const ReceiptTimelinePanel = ({ timeline }: { timeline: ReceiptTimelineState }) => {
  const [text, setText] = useState("");
  const [notice, setNotice] = useState("");
  const [importing, setImporting] = useState(false);
  const restore = async () => {
    const hashes = [...new Set(text.match(/0x[0-9a-f]{64}/gi) ?? [])];
    if (!hashes.length) { setNotice("请粘贴完整交易哈希，也可以粘贴交易链接。"); return; }
    setImporting(true);
    setNotice("正在从交易回执恢复事件…");
    let count = 0;
    try {
      for (const hash of hashes) count += await timeline.importTransaction(hash);
      setNotice(count ? `已从回执读取 ${count} 条订单事件，刷新后会自动恢复。` : "回执没有本合约的订单事件，请核对交易哈希。");
      if (count) setText("");
    } catch (reason) {
      setNotice(`读取未完成：${reason instanceof Error ? reason.message : String(reason)}`);
    } finally { setImporting(false); }
  };

  return (
    <div className="rounded-lg border border-base-300 bg-base-200 p-4 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong>链上事件：已读取 {timeline.events.length} 条</strong>
        <button type="button" className="btn btn-xs" disabled={importing} onClick={timeline.restart}>重新连接</button>
      </div>
      <p className="m-0 text-xs break-all">{timeline.status}</p>
      {timeline.error && <p className="m-0 text-xs text-error break-all">{timeline.error}</p>}
      <p className="m-0 text-xs text-base-content/70">
        已读取交易会在此浏览器保存，并在刷新后重新核对回执。较早且未载入的交易可通过哈希恢复。
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className="input input-bordered input-sm flex-1 min-w-0"
          placeholder="粘贴旧交易哈希或交易链接"
          value={text}
          onChange={event => setText(event.target.value)}
          onKeyDown={event => { if (event.key === "Enter" && timeline.ready && !importing) void restore(); }}
        />
        <button type="button" className="btn btn-sm btn-primary" disabled={!timeline.ready || importing} onClick={() => void restore()}>
          {importing ? "读取中…" : "恢复交易事件"}
        </button>
      </div>
      {notice && <p className="m-0 text-xs break-all">{notice}</p>}
    </div>
  );
};
