import { PartyDetails as PartyDetailsType } from "@/types/invoice";
import { Input } from "@/components/ui/input";

interface PartyDetailsProps {
  title: string;
  party: PartyDetailsType;
  onPartyChange: (party: PartyDetailsType) => void;
  editable?: boolean;
}

export const PartyDetails = ({
  title,
  party,
  onPartyChange,
  editable = true,
}: PartyDetailsProps) => {
  const inputClass = editable
    ? "invoice-cell-input"
    : "bg-transparent border-0 cursor-default";

  return (
    <div className="p-4">
      <div className="invoice-section-title mb-2">{title}</div>
      <Input
        value={party.name}
        onChange={(e) => onPartyChange({ ...party, name: e.target.value })}
        className={`${inputClass} font-bold text-base mb-1`}
        placeholder="Party Name"
        readOnly={!editable}
      />
      <Input
        value={party.address}
        onChange={(e) => onPartyChange({ ...party, address: e.target.value })}
        className={`${inputClass} text-sm text-muted-foreground mb-2`}
        placeholder="Address"
        readOnly={!editable}
      />
      <div className="text-sm">
        <span className="font-medium">GSTIN/UIN: </span>
        <Input
          value={party.gstin}
          onChange={(e) => onPartyChange({ ...party, gstin: e.target.value })}
          className={`${inputClass} inline-block w-auto`}
          placeholder=""
          readOnly={!editable}
        />
      </div>
      <div className="text-sm mt-1">
        <span className="font-medium">State Name: </span>
        <Input
          value={party.state}
          onChange={(e) => onPartyChange({ ...party, state: e.target.value })}
          className={`${inputClass} inline-block w-auto`}
          placeholder=""
          readOnly={!editable}
        />
      </div>
    </div>
  );
};
