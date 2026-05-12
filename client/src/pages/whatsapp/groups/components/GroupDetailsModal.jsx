import React, { useState, useEffect } from "react";
import { MdClose, MdDelete, MdAdd } from "react-icons/md";
import axios from "axios";

function GroupDetailsModal({
  group,
  phone_number_id,
  onClose,
  onGroupUpdated,
  onGroupDeleted,
}) {
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    subject: group.subject,
    description: group.description,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newParticipant, setNewParticipant] = useState("");
  const [joinRequests, setJoinRequests] = useState([]);
  const [inviteLink, setInviteLink] = useState(null);
  const [showAddParticipant, setShowAddParticipant] = useState(false);

  // Fetch join requests and invite link
  useEffect(() => {
    fetchJoinRequests();
    fetchInviteLink();
  }, [group.id]);

  const fetchJoinRequests = async () => {
    try {
      const response = await axios.get(
        `/v14.0/${phone_number_id}/groups/${group.id}/join_requests`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || "test_token"}`,
          },
        }
      );
      setJoinRequests(response.data.data || []);
    } catch (err) {
      console.error("Error fetching join requests:", err);
    }
  };

  const fetchInviteLink = async () => {
    try {
      const response = await axios.get(
        `/v14.0/${phone_number_id}/groups/${group.id}/invite_link`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || "test_token"}`,
          },
        }
      );
      setInviteLink(response.data);
    } catch (err) {
      console.error("Error fetching invite link:", err);
    }
  };

  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      const response = await axios.put(
        `/v14.0/${phone_number_id}/groups/${group.id}`,
        editData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || "test_token"}`,
          },
        }
      );
      onGroupUpdated(response.data);
      setEditMode(false);
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
      await axios.post(
        `/v14.0/${phone_number_id}/groups/${group.id}/participants`,
        { phone_numbers: [newParticipant.trim()] },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || "test_token"}`,
          },
        }
      );
      setNewParticipant("");
      setShowAddParticipant(false);
      // Refresh group data
      const response = await axios.get(
        `/v14.0/${phone_number_id}/groups/${group.id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || "test_token"}`,
          },
        }
      );
      onGroupUpdated(response.data);
    } catch (err) {
      console.error("Error adding participant:", err);
      setError(err.response?.data?.error || "Failed to add participant");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveParticipant = async (waId) => {
    if (!window.confirm("Remove this participant?")) return;

    try {
      setLoading(true);
      await axios.delete(
        `/v14.0/${phone_number_id}/groups/${group.id}/participants/${waId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || "test_token"}`,
          },
        }
      );
      // Refresh group data
      const response = await axios.get(
        `/v14.0/${phone_number_id}/groups/${group.id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || "test_token"}`,
          },
        }
      );
      onGroupUpdated(response.data);
    } catch (err) {
      console.error("Error removing participant:", err);
      setError(err.response?.data?.error || "Failed to remove participant");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveJoinRequest = async (waId) => {
    try {
      setLoading(true);
      await axios.post(
        `/v14.0/${phone_number_id}/groups/${group.id}/join_requests/${waId}/approve`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || "test_token"}`,
          },
        }
      );
      fetchJoinRequests();
      // Refresh group data
      const response = await axios.get(
        `/v14.0/${phone_number_id}/groups/${group.id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || "test_token"}`,
          },
        }
      );
      onGroupUpdated(response.data);
    } catch (err) {
      console.error("Error approving join request:", err);
      setError(err.response?.data?.error || "Failed to approve join request");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectJoinRequest = async (waId) => {
    try {
      setLoading(true);
      await axios.post(
        `/v14.0/${phone_number_id}/groups/${group.id}/join_requests/${waId}/reject`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || "test_token"}`,
          },
        }
      );
      fetchJoinRequests();
    } catch (err) {
      console.error("Error rejecting join request:", err);
      setError(err.response?.data?.error || "Failed to reject join request");
    } finally {
      setLoading(false);
    }
  };

  const handleResetInviteLink = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        `/v14.0/${phone_number_id}/groups/${group.id}/invite_link/reset`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || "test_token"}`,
          },
        }
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
      await axios.delete(`/v14.0/${phone_number_id}/groups/${group.id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || "test_token"}`,
        },
      });
      onGroupDeleted(group.id);
      onClose();
    } catch (err) {
      console.error("Error deleting group:", err);
      setError(err.response?.data?.error || "Failed to delete group");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full mx-4 my-8">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Group Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <MdClose className="text-2xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-96 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Group Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Group Information
            </h3>
            {editMode ? (
              <form onSubmit={handleUpdateGroup} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={editData.subject}
                    onChange={(e) =>
                      setEditData({ ...editData, subject: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editData.description}
                    onChange={(e) =>
                      setEditData({ ...editData, description: e.target.value })
                    }
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Subject</p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {group.subject}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Description</p>
                  <p className="text-gray-900 dark:text-white">
                    {group.description || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Join Mode</p>
                  <p className="text-gray-900 dark:text-white">
                    {group.join_approval_mode === "on_approval"
                      ? "Approval Required"
                      : "Open"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Created</p>
                  <p className="text-gray-900 dark:text-white">
                    {formatDate(group.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => setEditMode(true)}
                  className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Participants */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Participants ({group.participant_count || 0}/8)
              </h3>
              <button
                onClick={() => setShowAddParticipant(!showAddParticipant)}
                className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 rounded"
              >
                <MdAdd className="text-xl" />
              </button>
            </div>

            {showAddParticipant && (
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newParticipant}
                  onChange={(e) => setNewParticipant(e.target.value)}
                  placeholder="Phone number"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddParticipant}
                  disabled={loading}
                  className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            )}

            <div className="space-y-2">
              {group.participants && group.participants.length > 0 ? (
                group.participants.map((participant) => (
                  <div
                    key={participant}
                    className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700 rounded"
                  >
                    <span className="text-sm text-gray-900 dark:text-white">
                      {participant}
                    </span>
                    <button
                      onClick={() => handleRemoveParticipant(participant)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-700 text-sm disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No participants
                </p>
              )}
            </div>
          </div>

          {/* Join Requests */}
          {group.join_approval_mode === "on_approval" && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Join Requests ({joinRequests.length})
              </h3>
              <div className="space-y-2">
                {joinRequests.length > 0 ? (
                  joinRequests.map((request) => (
                    <div
                      key={request.wa_id}
                      className="flex justify-between items-center p-2 bg-yellow-50 dark:bg-gray-700 rounded"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {request.wa_id}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {formatDate(request.requested_at)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveJoinRequest(request.wa_id)}
                          disabled={loading}
                          className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectJoinRequest(request.wa_id)}
                          disabled={loading}
                          className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No pending requests
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Invite Link */}
          {inviteLink && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Invite Link
              </h3>
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Link
                </p>
                <p className="text-sm text-gray-900 dark:text-white break-all mb-2">
                  {inviteLink.invite_link}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  Expires: {formatDate(new Date(inviteLink.expiration_timestamp * 1000))}
                </p>
                <button
                  onClick={handleResetInviteLink}
                  disabled={loading}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Reset Link
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={handleDeleteGroup}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <MdDelete /> Delete Group
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default GroupDetailsModal;
