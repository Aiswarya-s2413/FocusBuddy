export const Textarea = (props) => {
    return (
      <textarea
        {...props}
        className={`w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 shadow-sm
          focus:border-[#6E59A5] focus:outline-none focus:ring-1 focus:ring-[#6E59A5]
          resize-none
          ${props.className ?? ""}`} 
      />
    );
  };
  