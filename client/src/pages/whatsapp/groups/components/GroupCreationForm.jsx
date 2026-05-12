import React, { useState } from "react";
import { MdClose } from "react-icons/md";
import axios from "axios";

function GroupCreationForm({ phone_number_id, onClose, onGroupCreated }) {
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    join_approval_mode: "off",
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
      if (formData.participant_phone_numbers.length >= 7) {
        setError("Maximum 7 additional participants allowed (business phone is automatically added)");
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
      console.log("Submitting group creation form...", {
        url: `/v14.0/${phone_number_id}/groups`,
        data: formData
      });
      const response = await axios.post(
        `/v14.0/${phone_number_id}/groups`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || "eyJ3YmFfaWQiOiIxMTAwMDAwMDAwMDAxIiwiYXBwX2lkIjoiMTQwMDAwMDAwMSJ9"}`,
          },
        }
      );

      // Fetch the created group details
      const groupResponse = await axios.get(
        `/v14.0/${phone_number_id}/groups/${response.data.group_id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || "test_token"}`,
          },
        }
      );

      onGroupCreated(groupResponse.data);
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
              <option value="off">Open (no approval needed)</option>
              <option value="on_approval">Approval Required</option>
            </select>
          </div>

          {/* Participants */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Add Participants (Max 7)
            </label>
            {/* <p className="text-xs text-gray-500 mb-2">Note: The business phone ({phone_number_id}) will be added as the first participant.</p> */}
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={participantInput}
                onChange={(e) => setParticipantInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddParticipant();
                  }
                }}
                placeholder="Phone number"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddParticipant}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>

            {/* Participants List */}
            {formData.participant_phone_numbers.length > 0 && (
              <div className="space-y-2">
                {formData.participant_phone_numbers.map((phone, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700 rounded"
                  >
                    <span className="text-sm text-gray-900 dark:text-white">
                      {phone}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveParticipant(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
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
