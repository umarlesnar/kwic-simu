import React, { useState, useEffect, useCallback, useRef } from "react";
import { businessService } from "@api/businessService";
import { toast } from "react-toastify";
import { ImSpinner11 } from "react-icons/im";
import { 
  MdClose, 
  MdGroups, 
  MdSend, 
  MdArrowBack, 
  MdAttachFile, 
  MdInsertDriveFile,
  MdGroupAdd,
  MdPersonAdd,
  MdCheck,
  MdClose as MdCancel
} from "react-icons/md";
import { io } from "socket.io-client";
import WBMessages from "@utils/WBMessages";
import { WebhookService } from "@api/WebhookService";

const ClientGroupsModal = ({ isOpen, onClose, phone_number_id, wba_id, client }) => {
  const [view, setView] = useState("list"); // 'list', 'chat', 'join', 'requests'
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Join Group State
  const [inviteLink, setInviteLink] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  // Join Requests State
  const [joinRequests, setJoinRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Socket.IO Setup
  useEffect(() => {
    if (isOpen && activeGroup && view === "chat") {
      const socket = io(window.location.origin, {
        path: "/socket.io",
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        const topic = `message/whatsapp/${activeGroup.id}`;
        socket.emit("subscribe", { topic });
        console.log(`Subscribed to topic: ${topic}`);
      });

      socket.on("topic-data", (data) => {
        if (data.data) {
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some(m => m.id === data.data.id)) return prev;
            return [...prev, data.data];
          });
        }
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [isOpen, activeGroup, view]);

  const fetchGroups = useCallback(async () => {
    if (!client?.wa_id) return;
    try {
      setLoading(true);
      const response = await businessService.getClientGroups(phone_number_id, client.wa_id);
      setGroups(response.data || []);
    } catch (err) {
      toast.error("Failed to fetch client groups: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [phone_number_id, client]);

  const fetchMessages = useCallback(async (groupId) => {
    try {
      setMessagesLoading(true);
      const response = await businessService.getChatMessages(phone_number_id, groupId);
      setMessages(response.data || []);
    } catch (err) {
      toast.error("Failed to fetch messages: " + err.message);
    } finally {
      setMessagesLoading(false);
    }
  }, [phone_number_id]);

  const fetchJoinRequests = useCallback(async (groupId) => {
    try {
      setRequestsLoading(true);
      const response = await businessService.getGroupJoinRequests(groupId);
      setJoinRequests(response.data || []);
    } catch (err) {
      toast.error("Failed to fetch join requests: " + err.message);
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && view === "list") {
      fetchGroups();
    }
  }, [isOpen, view, fetchGroups]);

  const handleOpenChat = (group) => {
    setActiveGroup(group);
    setView("chat");
    fetchMessages(group.id);
  };

  const handleBackToList = () => {
    setView("list");
    setActiveGroup(null);
    setMessages([]);
    setJoinRequests([]);
  };

  const handleJoinGroup = async (e) => {
    e?.preventDefault();
    if (!inviteLink.trim() || isJoining) return;

    try {
      setIsJoining(true);
      const response = await businessService.joinGroup(inviteLink.trim(), client.wa_id);
      
      if (response.status === "joined") {
        toast.success("Successfully joined the group!");
        setInviteLink("");
        setView("list");
        fetchGroups();
      } else if (response.status === "request_pending") {
        toast.info("Join request sent. Waiting for approval.");
        setInviteLink("");
        setView("list");
      }
    } catch (err) {
      toast.error(err.message || "Failed to join group");
    } finally {
      setIsJoining(false);
    }
  };

  const handleApproveRequest = async (waId) => {
    try {
      await businessService.approveJoinRequests(activeGroup.id, [waId]);
      toast.success(`Approved ${waId}`);
      fetchJoinRequests(activeGroup.id);
    } catch (err) {
      toast.error("Failed to approve: " + err.message);
    }
  };

  const handleRejectRequest = async (waId) => {
    try {
      await businessService.rejectJoinRequests(activeGroup.id, [waId]);
      toast.success(`Rejected ${waId}`);
      fetchJoinRequests(activeGroup.id);
    } catch (err) {
      toast.error("Failed to reject: " + err.message);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!messageInput.trim() || isSending) return;

    try {
      setIsSending(true);
      
      const wb = new WBMessages(wba_id || "1100000000001", phone_number_id);
      wb.display_phone_number = phone_number_id;
      wb.wa_id = client.wa_id;

      const profileName = client.profile?.name || client.wa_id;
      const payload = wb.getTextMessage(messageInput.trim(), profileName);

      // IMPORTANT: Inject group context so the server knows it's a group message
      const messageObj = payload.entry[0].changes[0].value.messages[0];
      messageObj.context = { group_id: activeGroup.id };

      await WebhookService.push(payload);

      setMessageInput("");
      // Socket will update the messages list
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

      // 1. Upload to simulator media endpoint (using fetch/axios directly for multipart)
      const uploadRes = await businessService.uploadMedia(formData);
      const mediaData = uploadRes.data;

      // 2. Prepare payload
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
        caption: file.name
      };

      if (!isImage) {
        mediaPayload.filename = file.name;
      }

      const profileName = client.profile?.name || client.wa_id;
      const payload = wb.getMediaMessage(fileType, mediaPayload, profileName);

      // IMPORTANT: Inject group context
      const messageObj = payload.entry[0].changes[0].value.messages[0];
      messageObj.context = { group_id: activeGroup.id };

      await WebhookService.push(payload);

      toast.success(`${isImage ? "Image" : "File"} sent!`);
    } catch (err) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 overflow-hidden flex flex-col h-[80vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            {view !== "list" && (
              <button 
                onClick={handleBackToList}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <MdArrowBack className="text-xl text-gray-600 dark:text-gray-400" />
              </button>
            )}
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <MdGroups className="text-2xl text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate max-w-[300px]">
                {view === "chat" ? activeGroup.subject : 
                 view === "join" ? "Join New Group" :
                 view === "requests" ? "Join Requests" : "Client Groups"}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {view === "chat" ? `${activeGroup.participant_count} participants` : 
                 view === "requests" ? activeGroup?.subject :
                 `${client?.profile?.name || client?.wa_id}'s groups`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {view === "list" && (
              <button
                onClick={() => setView("join")}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <MdGroupAdd className="text-lg" />
                Join Group
              </button>
            )}
            {view === "chat" && (
              <button
                onClick={() => {
                  setView("requests");
                  fetchJoinRequests(activeGroup.id);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors shadow-sm"
              >
                <MdPersonAdd className="text-lg" />
                Requests
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors ml-2"
            >
              <MdClose className="text-2xl" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col relative bg-gray-50 dark:bg-gray-900/50">
          
          {view === "list" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <ImSpinner11 className="text-4xl text-blue-600 animate-spin mb-4" />
                  <p className="text-gray-500">Fetching groups...</p>
                </div>
              ) : groups.length === 0 ? (
                <div className="text-center py-20">
                  <MdGroups className="text-6xl text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No group memberships found</p>
                  <button
                    onClick={() => setView("join")}
                    className="mt-4 px-4 py-2 text-blue-600 font-bold hover:underline"
                  >
                    Join a group using invite link
                  </button>
                </div>
              ) : (
                groups.map((group) => (
                  <div
                    key={group.id}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex justify-between items-center hover:shadow-md transition-shadow group"
                  >
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">{group.subject}</h3>
                      <p className="text-xs text-gray-500 mt-1">{group.participant_count} members</p>
                    </div>
                    <button
                      onClick={() => handleOpenChat(group)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      Chat
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {view === "join" && (
            <div className="flex-1 p-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 max-w-md mx-auto mt-10">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Enter Group Invite Link</h3>
                <form onSubmit={handleJoinGroup} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Invite Link
                    </label>
                    <input
                      type="text"
                      value={inviteLink}
                      onChange={(e) => setInviteLink(e.target.value)}
                      placeholder="https://chat.whatsapp.com/..."
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={isJoining || !inviteLink.trim()}
                      className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {isJoining ? "Joining..." : "Join Group"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setView("list")}
                      className="px-4 py-2 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    <strong>Note:</strong> If the group has manual approval enabled, your request will be sent to the group admins for review.
                  </p>
                </div>
              </div>
            </div>
          )}

          {view === "requests" && (
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {requestsLoading ? (
                <div className="flex justify-center py-20">
                  <ImSpinner11 className="text-4xl text-blue-600 animate-spin" />
                </div>
              ) : joinRequests.length === 0 ? (
                <div className="text-center py-20">
                  <MdPersonAdd className="text-6xl text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No pending join requests</p>
                  <button
                    onClick={() => setView("chat")}
                    className="mt-4 text-blue-600 hover:underline text-sm font-bold"
                  >
                    Back to Chat
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Pending Approval</h3>
                  {joinRequests.map((request) => (
                    <div 
                      key={request.wa_id}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex justify-between items-center shadow-sm"
                    >
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{request.wa_id}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">Requested: {new Date(request.requested_at).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveRequest(request.wa_id)}
                          className="p-2 bg-green-100 text-green-600 hover:bg-green-600 hover:text-white rounded-lg transition-all"
                          title="Approve"
                        >
                          <MdCheck className="text-xl" />
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.wa_id)}
                          className="p-2 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-all"
                          title="Reject"
                        >
                          <MdCancel className="text-xl" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {view === "chat" && (
            <>
              {/* Chat Messages */}
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
                    const isOutgoing = msg.direction === "outgoing";
                    return (
                      <div 
                        key={msg.id || idx} 
                        className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[80%] rounded-2xl p-3 shadow-sm ${
                          isOutgoing 
                            ? "bg-blue-600 text-white rounded-tr-none" 
                            : "bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-tl-none border border-gray-100 dark:border-gray-600"
                        }`}>
                          {!isOutgoing && (
                            <p className="text-[10px] font-bold opacity-70 mb-1">{msg.from}</p>
                          )}
                          
                          {/* Render Content */}
                          {msg.type === "text" && <p className="text-sm whitespace-pre-wrap">{msg.text?.body || msg.message?.text?.body || msg.content}</p>}
                          
                          {msg.type === "image" && (
                            <div className="space-y-1">
                                <img 
                                    src={msg.message?.image?.link || msg.message?.image?.url || msg.content} 
                                    alt="Shared" 
                                    className="rounded-lg max-h-60 object-cover"
                                />
                                {(msg.message?.image?.caption || msg.caption) && <p className="text-sm">{msg.message?.image?.caption || msg.caption}</p>}
                            </div>
                          )}

                          {msg.type === "document" && (
                            <div className="flex items-center gap-2 bg-black/10 p-2 rounded-lg">
                                <MdInsertDriveFile className="text-2xl" />
                                <div className="overflow-hidden">
                                    <p className="text-sm font-medium truncate">{msg.message?.document?.caption || msg.message?.document?.filename || "Document"}</p>
                                    <p className="text-[10px] opacity-70">File shared</p>
                                </div>
                            </div>
                          )}

                          <p className={`text-[9px] mt-1 text-right ${isOutgoing ? "text-blue-100" : "text-gray-400"}`}>
                            {new Date(msg.timestamp || msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Attach File"
                  >
                    {isUploading ? <ImSpinner11 className="animate-spin text-xl" /> : <MdAttachFile className="text-2xl rotate-45" />}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientGroupsModal;
