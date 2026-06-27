import React, { useState } from "react";
import { MdClose } from "react-icons/md";
import axios from "axios";

function GroupCreationForm({ phone_number_id, onClose, onGroupCreated }) {
  const [formData, setFormData] = useState({
    messaging_product: "whatsapp",
    subject: "",
    description: "",
    join_approval_mode: "auto_approve",
    participant_phone_numbers: [],
  });
  const [participantInput, setParticipantInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddParticipant = () => {
    if (participantInput.trim()) {
      if (formData.participant_phone_numbers.length >= 8) {
        setError("Maximum 8 participants allowed");
        return;
      }
      setFormData((prev) => ({
        ...prev,
        participant_phone_numbers: [
          ...prev.participant_phone_numbers,
          participantInput.trim(),
        ],
      }));
      setParticipantInput("");
      setError(null);
    }
  };

  const handleRemoveParticipant = (index) => {
    setFormData((prev) => ({
      ...prev,
      participant_phone_numbers: prev.participant_phone_numbers.filter(
        (_, i) => i !== index
      ),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.subject.trim()) {
      setError("Subject is required");
      return;
    }

    try {
      setLoading(true);
      // console.log("Submitting group creation form...", {
      //   url: `/v14.0/${phone_number_id}/groups`,
      //   data: formData
      // });
      const response = await axios.post(
        `/v14.0/${phone_number_id}/groups`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || "eyJhcHBfaWQiOiIxNDAwMDAwMDAxIiwid2JhX2lkIjoiMTEwMDAwMDAwMSIsInBob25lX251bWJlcl9pZCI6IjEyMTcyMzI4In0"}`,
          },
        }
      );

      setLoading(false);
      onGroupCreated(response.data);
    } catch (err) {
      console.error("Error creating group:", err);
      setError(
        err.response?.data?.error || "Failed to create group"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Create Group
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <MdClose className="text-2xl" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Subject *
            </label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              placeholder="Group name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Group description"
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Join Approval Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Join Approval Mode
            </label>
            <select
              name="join_approval_mode"
              value={formData.join_approval_mode}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="auto_approve">Auto Approve (Open)</option>
              <option value="approval_required">Approval Required</option>
            </select>
          </div>

          {/* Participants Notice */}
          <div className="p-3 bg-blue-50 dark:bg-gray-700 rounded-lg border border-blue-100 dark:border-gray-600">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Note: Group creation requires manual approval. Once approved, you can share the invite link.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default GroupCreationForm;
