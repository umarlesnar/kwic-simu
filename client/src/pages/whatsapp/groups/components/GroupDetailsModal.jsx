import React, { useState, useEffect } from "react";
import {
  MdClose,
  MdDelete,
  MdAdd,
  MdInfo,
  MdPeople,
  MdPersonAdd,
  MdSettings,
  MdPlayArrow,
  MdRefresh,
  MdOutlineMessage,
} from "react-icons/md";
import axios from "axios";
import { WebhookService } from "@api/WebhookService";
import {
  buildGroupDeleteSuccess,
  buildGroupParticipantsRemoveSuccess,
  buildGroupSettingsUpdateSuccess,
  buildGroupParticipantsAddInviteLinkSuccess,
  buildGroupJoinRequestCreated,
  buildGroupParticipantsAddFail,
} from "../utils/wbGroupFailedWebhooks";
import { resolveWbaIdForPhone } from "../utils/resolveWbaId";
import { groupsWebhookAuthHeaders } from "../utils/groupsApiHeaders";
import {
  approveJoinRequestsViaClient,
  rejectJoinRequestsViaClient,
} from "../utils/groupWebhookClientActions";

function GroupDetailsModal({
  group,
  phone_number_id,
  wba_id,
  onClose,
  onGroupUpdated,
  onGroupDeleted,
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [editData, setEditData] = useState({
    subject: group.subject,
    description: group.description,
    join_approval_mode: group.join_approval_mode,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newParticipant, setNewParticipant] = useState("");
  const [newParticipantDirect, setNewParticipantDirect] = useState("");
  const [joinRequests, setJoinRequests] = useState([]);
  const [inviteLink, setInviteLink] = useState(null);


  // Fetch join requests and invite link
  useEffect(() => {
    fetchJoinRequests();
    fetchInviteLink();
  }, [group.id]);

  const fetchJoinRequests = async () => {
    try {
      const response = await axios.get(`/v14.0/${group.id}/join_requests`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || "eyJhcHBfaWQiOiIxNDAwMDAwMDAxIiwid2JhX2lkIjoiMTEwMDAwMDAwMSIsInBob25lX251bWJlcl9pZCI6IjEyMTcyMzI4In0"}`,
        },
      });
      setJoinRequests(response.data.data || []);
    } catch (err) {
      console.error("Error fetching join requests:", err);
    }
  };

  const fetchInviteLink = async () => {
    try {
      const response = await axios.get(`/v14.0/${group.id}/invite_link`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || "eyJhcHBfaWQiOiIxNDAwMDAwMDAxIiwid2JhX2lkIjoiMTEwMDAwMDAwMSIsInBob25lX251bWJlcl9pZCI6IjEyMTcyMzI4In0"}`,
        },
      });
      setInviteLink(response.data);
    } catch (err) {
      console.error("Error fetching invite link:", err);
    }
  };

  const effectiveWbaId = async () =>
    wba_id || (await resolveWbaIdForPhone(phone_number_id));

  const handleUpdateGroup = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      const response = await axios.post(
        `/v14.0/${group.id}`,
        {
          messaging_product: "whatsapp",
          ...editData,
        },
        { headers: groupsWebhookAuthHeaders() },
      );
      const updated = response.data;
      const resolvedWbaId = await effectiveWbaId();
      const settingsPayload = {
        subject:
          editData.subject !== group.subject ? editData.subject : undefined,
        description:
          editData.description !== group.description
            ? editData.description
            : undefined,
        join_approval_mode:
          editData.join_approval_mode !== group.join_approval_mode
            ? editData.join_approval_mode
            : undefined,
      };
      const hasSettingsChange = Object.values(settingsPayload).some(
        (v) => v !== undefined
      );
      if (resolvedWbaId && hasSettingsChange) {
        await WebhookService.push(
          buildGroupSettingsUpdateSuccess(
            resolvedWbaId,
            phone_number_id,
            { ...group, request_id: updated.request_id || group.request_id },
            settingsPayload
          )
        );
      }
      onGroupUpdated(updated);
      setError(null);
    } catch (err) {
      console.error("Error updating group:", err);
      setError(err.response?.data?.error || "Failed to update group");
    } finally {
      setLoading(false);
    }
  };

  const handleAddParticipant = async () => {
    if (!newParticipant.trim()) return;

    try {
      setLoading(true);
      const response = await axios.post(
        `/v14.0/${group.id}/participants`,
        {
          messaging_product: "whatsapp",
          phone_numbers: [newParticipant.trim()],
        },
        {
          headers: groupsWebhookAuthHeaders(),
        },
      );

      const data = response.data;
      const resolvedWbaId = await effectiveWbaId();
      const failedJoinRequests = data.failed_join_requests || [];
      const failedIds = failedJoinRequests.map(f => f.join_request_id).filter(Boolean);

      if (resolvedWbaId) {
        if (failedIds.length > 0) {
          await approveJoinRequestsViaClient({
            group_id: group.id,
            phone_number_id,
            wba_id: resolvedWbaId,
            join_requests: failedIds,
            joinRequestsList: [],
          });
        }

        // Push standard add failures only for non-join-request failures, if any
        const nonJrFailedParticipants = (data.failed_participants || []).filter((p) => {
          return !failedJoinRequests.some((f) => {
            let decodedWaId = null;
            try {
              const decoded = atob(f.join_request_id);
              const parts = decoded.split(":");
              if (parts.length >= 2) {
                decodedWaId = parts[1];
              }
            } catch (e) {
              // ignore
            }
            const matchId = decodedWaId || f.join_request_id;
            return matchId === p.input || matchId.includes(p.input) || p.input.includes(matchId);
          });
        });
        if (nonJrFailedParticipants.length > 0) {
          const is_partial = (Array.isArray(data.added_participants) && data.added_participants.length > 0) ||
                             (data.status === "request_pending" && Array.isArray(data.join_requests) && data.join_requests.length > 0);
          await WebhookService.push(
            buildGroupParticipantsAddFail(
              resolvedWbaId,
              phone_number_id,
              group.id,
              nonJrFailedParticipants,
              is_partial
            )
          );
        }

        if (data.status === "request_pending" && Array.isArray(data.join_requests)) {
          for (const jr of data.join_requests) {
            await WebhookService.push(
              buildGroupJoinRequestCreated(
                resolvedWbaId,
                phone_number_id,
                group,
                {
                  wa_id: jr.wa_id,
                  join_request_id: jr.join_request_id,
                  reason: "invite_link",
                }
              )
            );
          }
        } else if ((data.status === "joined" || !data.status) && Array.isArray(data.added_participants)) {
          for (const wa_id of data.added_participants) {
            await WebhookService.push(
              buildGroupParticipantsAddInviteLinkSuccess(
                resolvedWbaId,
                phone_number_id,
                group.id,
                wa_id
              )
            );
          }
        }
      }

      setNewParticipant("");
      if ((data.status === "request_pending" || failedIds.length > 0) && typeof fetchJoinRequests === "function") {
        fetchJoinRequests();
      }
      refreshGroup();
    } catch (err) {
      console.error("Error adding participant:", err);
      setError(err.response?.data?.error || "Failed to add participant");
    } finally {
      setLoading(false);
    }
  };

  const handleAddParticipantDirect = async () => {
    if (!newParticipantDirect.trim()) return;

    try {
      setLoading(true);
      const response = await axios.post(
        `/v14.0/${group.id}/participants`,
        {
          messaging_product: "whatsapp",
          phone_numbers: [newParticipantDirect.trim()],
          bypass_approval: true,
        },
        {
          headers: groupsWebhookAuthHeaders(),
        },
      );

      const data = response.data;
      const resolvedWbaId = await effectiveWbaId();

      if (resolvedWbaId) {
        if (Array.isArray(data.failed_participants) && data.failed_participants.length > 0) {
          const is_partial = Array.isArray(data.added_participants) && data.added_participants.length > 0;
          await WebhookService.push(
            buildGroupParticipantsAddFail(
              resolvedWbaId,
              phone_number_id,
              group.id,
              data.failed_participants,
              is_partial
            )
          );
        }

        if (Array.isArray(data.added_participants)) {
          for (const wa_id of data.added_participants) {
            await WebhookService.push(
              buildGroupParticipantsAddInviteLinkSuccess(
                resolvedWbaId,
                phone_number_id,
                group.id,
                wa_id
              )
            );
          }
        }
      }

      setNewParticipantDirect("");
      refreshGroup();
    } catch (err) {
      console.error("Error adding participant directly:", err);
      setError(err.response?.data?.error || "Failed to add participant directly");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveParticipant = async (waId) => {
    if (!window.confirm("Remove this participant?")) return;

    try {
      setLoading(true);
      const response = await axios.delete(`/v14.0/${group.id}/participants`, {
        data: {
          messaging_product: "whatsapp",
          participants: [waId],
        },
        headers: groupsWebhookAuthHeaders(),
      });
      const resolvedWbaId = await effectiveWbaId();
      const removed = response.data?.removed_participants || [{ input: waId }];
      if (resolvedWbaId && removed.length > 0) {
        await WebhookService.push(
          buildGroupParticipantsRemoveSuccess(
            resolvedWbaId,
            phone_number_id,
            group,
            removed
          )
        );
      }
      refreshGroup();
    } catch (err) {
      console.error("Error removing participant:", err);
      setError(err.response?.data?.error || "Failed to remove participant");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveJoinRequest = async (joinRequestId) => {
    try {
      setLoading(true);
      await approveJoinRequestsViaClient({
        group_id: group.id,
        phone_number_id,
        wba_id: await effectiveWbaId(),
        join_requests: [joinRequestId],
        joinRequestsList: joinRequests,
      });
      fetchJoinRequests();
      refreshGroup();
    } catch (err) {
      console.error("Error approving join request:", err);
      setError(err.response?.data?.error || "Failed to approve join request");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectJoinRequest = async (joinRequestId) => {
    try {
      setLoading(true);
      await rejectJoinRequestsViaClient({
        group_id: group.id,
        join_requests: [joinRequestId],
      });
      fetchJoinRequests();
    } catch (err) {
      console.error("Error rejecting join request:", err);
      setError(err.response?.data?.error || "Failed to reject join request");
    } finally {
      setLoading(false);
    }
  };

  const refreshGroup = async () => {
    try {
      const response = await axios.get(`/v14.0/${group.id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || "eyJhcHBfaWQiOiIxNDAwMDAwMDAxIiwid2JhX2lkIjoiMTEwMDAwMDAwMSIsInBob25lX251bWJlcl9pZCI6IjEyMTcyMzI4In0"}`,
        },
      });
      onGroupUpdated(response.data);
      fetchJoinRequests();
    } catch (err) {
      console.error("Error refreshing group:", err);
    }
  };

  const handleResetInviteLink = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        `/v14.0/${group.id}/invite_link`,
        { messaging_product: "whatsapp" },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || "eyJhcHBfaWQiOiIxNDAwMDAwMDAxIiwid2JhX2lkIjoiMTEwMDAwMDAwMSIsInBob25lX251bWJlcl9pZCI6IjEyMTcyMzI4In0"}`,
          },
        },
      );
      setInviteLink(response.data);
    } catch (err) {
      console.error("Error resetting invite link:", err);
      setError(err.response?.data?.error || "Failed to reset invite link");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm("Are you sure you want to delete this group?")) return;

    try {
      setLoading(true);
      await axios.delete(`/v14.0/${group.id}`, {
        headers: groupsWebhookAuthHeaders(),
      });
      const resolvedWbaId = await effectiveWbaId();
      if (resolvedWbaId) {
        await WebhookService.push(
          buildGroupDeleteSuccess(resolvedWbaId, phone_number_id, group)
        );
      }
      onGroupDeleted(group.id);
      onClose();
    } catch (err) {
      console.error("Error deleting group:", err);
      setError(err.response?.data?.error || "Failed to delete group");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenClientChat = (waId) => {
    const absolutePath =
      window.location.origin +
      window.location.pathname +
      `#/whatsapp/group-chat/${phone_number_id}/${group.id}?wba_id=1100000000001&wa_id=${waId}`;
    window.open(absolutePath, `group-${group.id}-${waId}`, "width=400,height=600");
  };



  const formatDate = (dateValue) => {
    if (!dateValue) return "N/A";

    // If it's already a Date object, use it directly
    if (dateValue instanceof Date) {
      return isNaN(dateValue.getTime())
        ? "Invalid Date"
        : dateValue.toLocaleString();
    }

    // Check if it's a Unix timestamp (seconds)
    const timestamp = parseInt(dateValue);
    if (
      !isNaN(timestamp) &&
      timestamp > 1000000000 &&
      timestamp < 10000000000
    ) {
      return new Date(timestamp * 1000).toLocaleString();
    }

    const d = new Date(dateValue);
    return isNaN(d.getTime()) ? "Invalid Date" : d.toLocaleString();
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: <MdInfo /> },
    { id: "participants", label: "Participants", icon: <MdPeople /> },
    { id: "join_requests", label: "Join Requests", icon: <MdPersonAdd /> },
    { id: "settings", label: "Settings", icon: <MdSettings /> },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {group.subject}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {group.id}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={refreshGroup}
              className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 p-2 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-full transition-colors"
              title="Refresh Group Data"
            >
              <MdRefresh className="text-xl" />
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <MdClose className="text-2xl" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm flex justify-between items-center">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-900 dark:text-red-400 font-bold"
              >
                ×
              </button>
            </div>
          )}

          {activeTab === "overview" && (
            <div className="space-y-6">
              <section>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Description
                </h3>
                <p className="text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  {group.description || "No description provided."}
                </p>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold mb-1">
                    Join Approval Mode
                  </p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {group.join_approval_mode === "approval_required"
                      ? "Approval Required"
                      : "Auto Approve"}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold mb-1">
                    Created At
                  </p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {formatDate(group.creation_timestamp)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold mb-1">
                    Participants
                  </p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {group.total_participant_count || 0} Members
                  </p>
                </div>
              </section>

              {inviteLink && (
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Invite Link
                  </h3>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-300 break-all mb-2 font-mono">
                      {inviteLink.invite_link}
                    </p>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={handleResetInviteLink}
                        disabled={loading}
                        className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline"
                      >
                        Reset Link
                      </button>
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}

          {activeTab === "participants" && (
            <div className="space-y-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newParticipantDirect}
                  onChange={(e) => setNewParticipantDirect(e.target.value)}
                  placeholder="Enter phone number (e.g. 919876543210)"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddParticipantDirect}
                  disabled={loading || !newParticipantDirect.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <MdAdd /> Add
                </button>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase">
                  Member List
                </h4>
                {group.participants && group.participants.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {group.participants.map((participant) => {
                      const waId =
                        typeof participant === "string"
                          ? participant
                          : participant.wa_id;
                      return (
                        <div
                          key={waId}
                          className="flex justify-between items-center p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm"
                        >
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {waId}
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleOpenClientChat(waId)}
                              className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                              title="Simulate Chat as this participant"
                            >
                              <MdOutlineMessage className="text-lg" />
                            </button>
                            <button
                              onClick={() => handleRemoveParticipant(waId)}
                              disabled={loading}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title="Remove Participant"
                            >
                              <MdDelete className="text-lg" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 italic">
                    No participants yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "join_requests" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-2 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600">
                <label className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase">
                  Numbers starting with 911451, 911452, 911453 will fail.
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newParticipant}
                    onChange={(e) => setNewParticipant(e.target.value)}
                    placeholder="Enter phone number (e.g. 919876543210)"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddParticipant}
                    disabled={loading || !newParticipant.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <MdAdd /> Add
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase">
                  Pending Requests ({joinRequests.length})
                </h4>
                {joinRequests.length > 0 ? (
                  <div className="space-y-2">
                    {joinRequests.map((request) => (
                      <div
                        key={request.join_request_id || request.wa_id}
                        className="flex justify-between items-center p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm"
                      >
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {request.wa_id}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {request.join_request_id}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Requested:{" "}
                            {formatDate(
                              request.creation_timestamp ?? request.requested_at,
                            )}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleApproveJoinRequest(request.join_request_id)
                            }
                            disabled={loading}
                            className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              handleRejectJoinRequest(request.join_request_id)
                            }
                            disabled={loading}
                            className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    No pending join requests.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <form onSubmit={handleUpdateGroup} className="space-y-6">
              <div className="space-y-4 bg-gray-50 dark:bg-gray-700/30 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Group Subject
                  </label>
                  <input
                    type="text"
                    value={editData.subject}
                    onChange={(e) =>
                      setEditData({ ...editData, subject: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Group Description
                  </label>
                  <textarea
                    value={editData.description}
                    onChange={(e) =>
                      setEditData({ ...editData, description: e.target.value })
                    }
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Join Approval Mode
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="join_approval_mode"
                        value="auto_approve"
                        checked={editData.join_approval_mode === "auto_approve"}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            join_approval_mode: e.target.value,
                          })
                        }
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Auto Approve
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="join_approval_mode"
                        value="approval_required"
                        checked={
                          editData.join_approval_mode === "approval_required"
                        }
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            join_approval_mode: e.target.value,
                          })
                        }
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Approval Required
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteGroup}
                  disabled={loading}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <MdDelete /> Delete Group
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default GroupDetailsModal;
