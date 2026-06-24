import React, { useState } from "react";
import { X } from "lucide-react";

interface LocationModalProps {
  onClose: () => void;
  onSave: (city: string, pincode: string) => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({ onClose, onSave }) => {
  const [tempCity, setTempCity] = useState("");
  const [tempPincode, setTempPincode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempPincode.length === 6 && tempCity.trim()) {
      onSave(tempCity.trim(), tempPincode);
    } else {
      alert("Please enter a valid city and 6-digit Pincode.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-sm bg-white border border-[#E8E5DF] rounded-3xl p-6 shadow-focus space-y-4 animate-fade-in-up">
        <div className="flex items-center justify-between border-b border-gray-150 pb-2.5">
          <h3 className="text-base font-serif text-charcoal">Specify Delivery Location</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Delivery City</label>
            <input
              type="text"
              required
              placeholder="e.g. Bangalore, Mumbai"
              value={tempCity}
              onChange={(e) => setTempCity(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Pin Code</label>
            <input
              type="text"
              required
              maxLength={6}
              placeholder="e.g. 560001"
              value={tempPincode}
              onChange={(e) => setTempPincode(e.target.value.replace(/\D/g, ""))}
              className="w-full p-3 border border-gray-200 rounded-xl text-center font-bold tracking-widest focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-[#C5A059] hover:bg-[#A8833E] text-white font-semibold rounded-full shadow-md transition-all"
          >
            SAVE LOCATION
          </button>
        </form>
      </div>
    </div>
  );
};
