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
  MdClose as MdCancel,
  MdRefresh,
  MdDelete
} from "react-icons/md";
import GroupChatView from "../../../shared/components/GroupChatView";
import { joinGroupViaInvite, leaveGroupViaClient } from "../../../groups/utils/groupWebhookClientActions";

const ClientGroupsModal = ({ isOpen, onClose, phone_number_id, wba_id, client, initialGroupId }) => {
  const [view, setView] = useState("list"); // 'list', 'chat', 'join'
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Join Group State
  const [inviteLink, setInviteLink] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  
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

  useEffect(() => {
    if (isOpen && view === "list") {
      fetchGroups();
    }
  }, [isOpen, view, fetchGroups]);

  const handleOpenChat = useCallback((group) => {
    const absolutePath =
      window.location.origin +
      window.location.pathname +
      `#/whatsapp/group-chat/${phone_number_id}/${group.id}?wba_id=${wba_id || "1100000000001"}&wa_id=${client.wa_id}`;
    window.open(absolutePath, `group-${group.id}-${client.wa_id}`, "width=400,height=600");
  }, [phone_number_id, wba_id, client]);


  useEffect(() => {
    if (isOpen && initialGroupId && groups.length > 0 && view === "list") {
      const group = groups.find(g => g.id === initialGroupId);
      if (group) {
        handleOpenChat(group);
      }
    }
  }, [isOpen, initialGroupId, groups, view, handleOpenChat]);

  const handleBackToList = () => {
    setView("list");
    setActiveGroup(null);
  };

  const handleRefresh = () => {
    if (view === "list") {
      fetchGroups();
    }
  };

  const handleLeaveGroup = async (group) => {
    if (!window.confirm(`Are you sure you want to leave the group "${group.subject}"?`)) return;

    try {
      setLoading(true);
      await leaveGroupViaClient({
        group_id: group.id,
        wa_id: client.wa_id,
        wba_id,
      });
      toast.success("Successfully left the group!");
      fetchGroups();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || "Failed to leave group");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (e) => {
    e?.preventDefault();
    if (!inviteLink.trim() || isJoining) return;

    try {
      setIsJoining(true);
      const response = await joinGroupViaInvite({
        invite_link: inviteLink,
        wa_id: client.wa_id,
        wba_id,
      });

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
                {view === "chat" ? activeGroup?.subject : 
                 view === "join" ? "Join New Group" : "Client Groups"}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {view === "chat" ? `participants` : 
                 `${client?.profile?.name || client?.wa_id}'s groups`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(view === "list" || view === "chat") && (
              <button
                onClick={handleRefresh}
                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                title={view === "chat" ? "Refresh View" : "Refresh Groups"}
              >
                <MdRefresh className="text-xl" />
              </button>
            )}
            {view === "list" && (
              <button
                onClick={() => setView("join")}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <MdGroupAdd className="text-lg" />
                Join Group
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenChat(group)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        Chat
                      </button>
                      <button
                        onClick={() => handleLeaveGroup(group)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Leave Group"
                      >
                        <MdDelete className="text-xl" />
                      </button>
                    </div>

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
              </div>
            </div>
          )}


        </div>
      </div>
    </div>
  );
};

export default ClientGroupsModal;
