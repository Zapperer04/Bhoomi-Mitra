// Deprecation Wrapper
// This file formerly contained the manual Indian Language dictionary system.
// It has been replaced by the dynamic Google Translate widget.
// We provide a tiny stub 'DT' object here so older dashboard scripts don't throw ReferenceErrors 
// and break execution. It simply returns hardcoded English, which Google Translate automatically translates.

window.DT = {
    ready: Promise.resolve(),
    t: function(key) {
        const dictionary = {
            "status.active": "Active", 
            "status.partially_sold": "Partially Sold", 
            "status.negotiating": "Negotiating", 
            "status.sold": "Sold", 
            "status.pending": "Pending",
            "no_active_crops": "No active crops found.", 
            "label.qty": "Qty", 
            "farmer.quantity_quintals": "Quintals", 
            "label.status": "Status", 
            "remove_listing": "Remove Listing", 
            "confirm_remove_listing": "Are you sure you want to remove this active listing?",
            "no_history": "No history available.", 
            "btn.clear": "Clear", 
            "no_interests": "No interests found.", 
            "open_chat": "Open Chat", 
            "final_accept_btn": "Accept & Finalize",
            "accept_btn": "Accept", 
            "reject_btn": "Reject", 
            "label.contractor": "Contractor", 
            "label.offered": "Offered Price",
            "failed_crops": "Failed to load crops data.", 
            "no_crops": "No active crops available right now.", 
            "interest_shown": "Interest Shown", 
            "resubmit_btn": "Resubmit Offer",
            "show_interest_btn": "Show Interest", 
            "quantity_lbl": "Quantity", 
            "quintals": "Quintals", 
            "price_lbl": "Price", 
            "quintal_short": "quintal", 
            "location_lbl": "Location", 
            "toast.interest_sent": "Interest has been sent successfully!"
        };
        // If the key exists in our fallback dict, return it. Otherwise just prettify the key.
        return dictionary[key] || key.split('.').pop().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
};