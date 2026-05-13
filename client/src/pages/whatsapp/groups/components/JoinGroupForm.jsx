import React, { useState } from "react";
import { MdClose } from "react-icons/md";
import axios from "axios";

function JoinGroupForm({ onClose, onJoined, phone_number_id }) {
  const [inviteLink, setInviteLink] = useState("");
  const [waId, setWaId] = useState(""); // User's phone number to join with
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!inviteLink.trim() || !waId.trim()) {
      setError("Invite link and Phone Number are required");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(
        "/v14.0/groups/join",
        {
          invite_link: inviteLink.trim(),
          wa_id: waId.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || "eyJhcHBfaWQiOiIxNDAwMDAwMDAxIiwid2JhX2lkIjoiMTEwMDAwMDAwMSIsInBob25lX251bWJlcl9pZCI6IjEyMTcyMzI4In0"}`,
          },
        }
      );

      if (response.data.status === "joined") {
        setSuccess("Successfully joined the group!");
        setTimeout(() => {
          onJoined();
          onClose();
        }, 1500);
      } else if (response.data.status === "request_pending") {
        setSuccess("Join request sent. Waiting for approval.");
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (err) {
      console.error("Error joining group:", err);
      setError(err.response?.data?.error || "Failed to join group. Check the link and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Join Group
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <MdClose className="text-2xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm">
              {success}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Invite Link
            </label>
            <input
              type="text"
              value={inviteLink}
              onChange={(e) => setInviteLink(e.target.value)}
              placeholder="https://chat.whatsapp.com/..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Your Phone Number (wa_id)
            </label>
            <input
              type="text"
              value={waId}
              onChange={(e) => setWaId(e.target.value)}
              placeholder="e.g. 919876543210"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Enter the phone number you want to join with.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Joining..." : "Join Group"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default JoinGroupForm;
