import React, { useState, useEffect, useCallback, useRef } from "react";
import { businessService } from "@api/businessService";
import { WebhookService } from "@api/WebhookService";
import WBMessages from "@utils/WBMessages";
import { toast } from "react-toastify";
import { ImSpinner11 } from "react-icons/im";
import {
  MdSend,
  MdAttachFile,
  MdInsertDriveFile,
} from "react-icons/md";
import { io } from "socket.io-client";
import axios from "axios";
import GroupMessageStatusActions from "./GroupMessageStatusActions";

const defaultToken =
  "eyJhcHBfaWQiOiIxNDAwMDAwMDAxIiwid2JhX2lkIjoiMTEwMDAwMDAwMSIsInBob25lX251bWJlcl9pZCI6IjEyMTcyMzI4In0";

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") || defaultToken}`,
});

const GroupChatView = ({ phone_number_id, wba_id, client, group, refreshKey }) => {
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    if (group?.id) {
      const socket = io(window.location.origin, {
        path: "/socket.io",
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        const topic = `message/whatsapp/${group.id}`;
        socket.emit("subscribe", { topic });
      });

      socket.on("topic-data", (data) => {
        if (data.data) {
          const normalized = {
            ...data.data,
            from: data.data.from ?? data.data.message?.from ?? data.data.wa_id,
          };
          setMessages((prev) => {
            const id = normalized.id;
            const idx = prev.findIndex((m) => m.id === id);
            if (idx === -1) return [...prev, normalized];
            const next = [...prev];
            next[idx] = { ...next[idx], ...normalized };
            return next;
          });
        }
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [group?.id]);

  const fetchMessages = useCallback(
    async (groupId) => {
      try {
        setMessagesLoading(true);
        const response = await businessService.getChatMessages(phone_number_id, groupId);
        const list = (response.data || []).map((m) => ({
          ...m,
          from: m.from ?? m.message?.from ?? m.wa_id,
        }));
        setMessages(list);
      } catch (err) {
        toast.error("Failed to fetch messages: " + err.message);
      } finally {
        setMessagesLoading(false);
      }
    },
    [phone_number_id]
  );

  useEffect(() => {
    if (group?.id) {
      fetchMessages(group.id);
    }
  }, [group?.id, fetchMessages, refreshKey]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!messageInput.trim() || isSending) return;

    try {
      setIsSending(true);

      const wb = new WBMessages(wba_id || "1100000000001", phone_number_id);
      wb.display_phone_number = phone_number_id;
      wb.wa_id = client.wa_id;

      const profileName = client.profile?.name || client.wa_id;
      const payload = wb.getGroupTextMessage(messageInput.trim(), profileName, group.id);

      await WebhookService.push(payload);

      setMessageInput("");
    } catch (err) {
      toast.error(err.message || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await businessService.uploadMedia(formData);
      const mediaData = uploadRes.data;

      const wb = new WBMessages(wba_id || "1100000000001", phone_number_id);
      wb.display_phone_number = phone_number_id;
      wb.wa_id = client.wa_id;

      const isImage = file.type.startsWith("image/");
      const fileType = isImage ? "image" : "document";

      const mediaPayload = {
        id: mediaData.id,
        url: mediaData.url,
        mime_type: mediaData.mime_type,
        sha256: mediaData.id,
        caption: file.name,
      };

      if (!isImage) {
        mediaPayload.filename = file.name;
      }

      const profileName = client.profile?.name || client.wa_id;
      const payload = wb.getGroupMediaMessage(fileType, mediaPayload, profileName, group.id);

      await WebhookService.push(payload);

      toast.success(`${isImage ? "Image" : "File"} sent!`);
    } catch (err) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col relative bg-gray-50 dark:bg-gray-900/50">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messagesLoading ? (
          <div className="flex justify-center py-10">
            <ImSpinner11 className="text-2xl text-blue-600 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm italic">No messages yet. Be the first to say something!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const senderId = msg.from ?? msg.sender ?? msg.wa_id;
            const isOwnMessage =
              client?.wa_id &&
              senderId != null &&
              String(senderId) === String(client.wa_id);
            const isOutgoing = isOwnMessage;
            return (
              <div
                key={msg.id || idx}
                className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-3 shadow-sm ${
                    isOutgoing
                      ? "bg-blue-600 text-white rounded-tr-none"
                      : "bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-tl-none border border-gray-100 dark:border-gray-600"
                  }`}
                >
                  {msg.pinned && (
                    <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 mb-1">
                      Pinned
                      {msg.pin_expiration_days != null ? ` · ${msg.pin_expiration_days}d` : ""}
                    </p>
                  )}
                  {!isOutgoing && senderId && (
                    <p className="text-[10px] font-bold opacity-70 mb-1">{senderId}</p>
                  )}

                  {msg.type === "text" && (
                    <p className="text-sm whitespace-pre-wrap">
                      {msg.text?.body || msg.message?.text?.body || msg.content}
                    </p>
                  )}

                  {msg.type === "image" && (
                    <div className="space-y-1">
                      <img
                        src={msg.message?.image?.link || msg.message?.image?.url || msg.content}
                        alt="Shared"
                        className="rounded-lg max-h-60 object-cover"
                      />
                      {(msg.message?.image?.caption || msg.caption) && (
                        <p className="text-sm">{msg.message?.image?.caption || msg.caption}</p>
                      )}
                    </div>
                  )}

                  {msg.type === "document" && (
                    <div className="flex items-center gap-2 bg-black/10 p-2 rounded-lg">
                      <MdInsertDriveFile className="text-2xl" />
                      <div className="overflow-hidden">
                        <p className="text-sm font-medium truncate">
                          {msg.message?.document?.caption || msg.message?.document?.filename || "Document"}
                        </p>
                        <p className="text-[10px] opacity-70">File shared</p>
                      </div>
                    </div>
                  )}

                  <div
                    className={`flex items-center justify-end gap-1 mt-1 ${
                      isOutgoing ? "text-blue-100" : "text-gray-400"
                    }`}
                  >
                    <p className="text-[9px]">
                      {new Date(msg.timestamp || msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {msg.id && (
                      <GroupMessageStatusActions
                        message={msg}
                        phone_number_id={phone_number_id}
                        wba_id={wba_id || "1100000000001"}
                        group_id={group.id}
                        refreshMessages={() => fetchMessages(group.id)}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>


      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title="Attach File"
          >
            {isUploading ? (
              <ImSpinner11 className="animate-spin text-xl" />
            ) : (
              <MdAttachFile className="text-2xl rotate-45" />
            )}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
          />

          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Type a group message..."
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 border-none rounded-full text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <button
            type="submit"
            disabled={!messageInput.trim() || isSending}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSending ? <ImSpinner11 className="animate-spin" /> : <MdSend className="text-xl" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default GroupChatView;
