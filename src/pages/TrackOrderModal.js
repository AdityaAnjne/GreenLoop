import React, { useEffect, useState } from "react";
import { X, MapPin, CheckCircle2, Circle } from "lucide-react";
import axiosInstance from "../api/axiosInstance";

const STATUS_LABELS = {
  PLACED: "Order placed",
  CONFIRMED: "Confirmed by retailer",
  PACKED: "Packed for shipment",
  SHIPPED: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const TrackOrderModal = ({ orderId, isDark, onClose }) => {
  const [trace, setTrace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchTrace = async () => {
      try {
        const token = localStorage.getItem("token") || localStorage.getItem("authToken");
        if (!token) return;

        const response = await axiosInstance.get(`/api/orders/${orderId}/trace`);
        if (!cancelled) {
          setTrace(response.data);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message || "Couldn't load the tracking timeline for this order.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTrace();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const bg = isDark ? "bg-slate-900" : "bg-white";
  const text = isDark ? "text-slate-100" : "text-gray-900";
  const subtext = isDark ? "text-slate-400" : "text-gray-500";
  const border = isDark ? "border-slate-700" : "border-gray-200";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${bg} ${text} rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto`}>
        <div className={`flex items-center justify-between p-5 border-b ${border} sticky top-0 ${bg}`}>
          <h2 className="text-lg font-semibold">Track Your Order</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-black/10">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-8">
          {loading ? (
            <p className={`text-center py-8 ${subtext}`}>Loading tracking details...</p>
          ) : error ? (
            <p className="text-center py-8 text-red-500">{error}</p>
          ) : !trace || trace.items.length === 0 ? (
            <p className={`text-center py-8 ${subtext}`}>No tracking information available yet.</p>
          ) : (
            trace.items.map((item) => (
              <div key={item.orderItemId} className={`border-b ${border} pb-6 last:border-0`}>
                <div className="mb-4">
                  <h3 className="font-semibold text-base">{item.productName || "Product"}</h3>
                  {item.farmerName && (
                    <p className={`text-sm ${subtext}`}>Grown by {item.farmerName}</p>
                  )}
                  {item.farmLatitude != null && item.farmLongitude != null && (
                    <a
                      href={`https://www.google.com/maps?q=${item.farmLatitude},${item.farmLongitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:underline mt-1"
                    >
                      <MapPin size={14} /> View farm location
                    </a>
                  )}
                </div>

                <div className="relative pl-6">
                  {item.timeline.map((event, idx) => {
                    const isLast = idx === item.timeline.length - 1;
                    return (
                      <div key={idx} className="relative pb-6 last:pb-0">
                        {!isLast && (
                          <span
                            className={`absolute left-[-15px] top-5 w-px h-full ${
                              isDark ? "bg-slate-700" : "bg-gray-200"
                            }`}
                          />
                        )}
                        <span className="absolute left-[-20px] top-0 text-emerald-600">
                          {isLast ? <CheckCircle2 size={18} /> : <Circle size={16} />}
                        </span>
                        <p className="font-medium text-sm">
                          {event.note || STATUS_LABELS[event.status] || event.status}
                        </p>
                        <p className={`text-xs ${subtext}`}>
                          {new Date(event.occurredAt).toLocaleString()}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackOrderModal;