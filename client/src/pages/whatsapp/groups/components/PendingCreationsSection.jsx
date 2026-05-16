import React, { useState, useEffect } from "react";
import axios from "axios";
import { MdCheck, MdClose, MdRefresh } from "react-icons/md";
import { WebhookService } from "@api/WebhookService";
import { buildGroupCreateSuccess, buildGroupCreateFail } from "../utils/wbGroupFailedWebhooks";
import { resolveWbaIdForPhone } from "../utils/resolveWbaId";
import { groupsWebhookAuthHeaders } from "../utils/groupsApiHeaders";

function PendingCreationsSection({ wba_id, phone_number_id, refreshTrigger, onCreationProcessed }) {
  const [pendingCreations, setPendingCreations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const fetchPendingCreations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/v14.0/${phone_number_id}/groups/pending`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        }
      );
      setPendingCreations(response.data?.data?.pending_creations || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching pending creations:", err);
      setError("Failed to fetch pending creations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (phone_number_id) {
      fetchPendingCreations();
    }
  }, [phone_number_id, refreshTrigger]);

  const effectiveWbaId = async () =>
    wba_id || (await resolveWbaIdForPhone(phone_number_id));

  const handleApprove = async (pending) => {
    const requestId = pending.request_id;
    try {
      setProcessingId(requestId);
      const response = await axios.post(
        `/v14.0/${phone_number_id}/groups/pending/${requestId}/approve`,
        {},
        { headers: groupsWebhookAuthHeaders() }
      );

      const createdGroup = response.data.group;
      const resolvedWbaId = await effectiveWbaId();
      if (createdGroup && resolvedWbaId) {
        const payload = buildGroupCreateSuccess(
          resolvedWbaId,
          phone_number_id,
          { ...createdGroup, request_id: createdGroup.request_id || requestId }
        );
        await WebhookService.push(payload);
      }

      setPendingCreations((prev) => prev.filter((p) => p.request_id !== requestId));
      if (onCreationProcessed) onCreationProcessed();
    } catch (err) {
      console.error("Error approving group creation:", err);
      alert("Failed to approve group creation");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (pending) => {
    const requestId = pending.request_id;
    if (!window.confirm("Are you sure you want to reject this group creation?")) return;
    try {
      setProcessingId(requestId);
      await axios.post(
        `/v14.0/${phone_number_id}/groups/pending/${requestId}/reject`,
        {},
        { headers: groupsWebhookAuthHeaders() }
      );

      const resolvedWbaId = await effectiveWbaId();
      if (resolvedWbaId) {
        const payload = buildGroupCreateFail(resolvedWbaId, phone_number_id, pending);
        await WebhookService.push(payload);
      }

      setPendingCreations((prev) => prev.filter((p) => p.request_id !== requestId));
    } catch (err) {
      console.error("Error rejecting group creation:", err);
      alert("Failed to reject group creation");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading && pendingCreations.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-sm text-gray-500">Loading pending requests...</p>
      </div>
    );
  }

  if (pendingCreations.length === 0) return null;

  return (
    <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl overflow-hidden shadow-sm">
      <div className="px-4 py-3 bg-yellow-100/50 dark:bg-yellow-800/30 border-b border-yellow-200 dark:border-yellow-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></span>
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
            Pending Group Creations ({pendingCreations.length})
          </h3>
        </div>
        <button
          onClick={fetchPendingCreations}
          className="p-1 hover:bg-yellow-200 dark:hover:bg-yellow-800 rounded transition-colors"
          title="Refresh pending requests"
        >
          <MdRefresh className={`text-yellow-700 dark:text-yellow-300 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="divide-y divide-yellow-200 dark:divide-yellow-800">
        {pendingCreations.map((pending) => (
          <div key={pending.request_id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 dark:text-white truncate">
                {pending.subject}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {pending.description || "No description"}
              </p>
              <div className="mt-1 flex gap-3 text-xs text-gray-500">
                <span>Mode: {pending.join_approval_mode === 'approval_required' ? 'Approval Required' : 'Auto Approve'}</span>
                <span>•</span>
                <span>Created: {new Date(pending.created_at).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleReject(pending)}
                disabled={processingId === pending.request_id}
                className="flex items-center gap-1 px-3 py-1.5 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <MdClose /> Reject
              </button>
              <button
                onClick={() => handleApprove(pending)}
                disabled={processingId === pending.request_id}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm disabled:opacity-50"
              >
                <MdCheck /> {processingId === pending.request_id ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PendingCreationsSection;
