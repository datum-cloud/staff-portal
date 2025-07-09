import BadgeState from './index';

export default function BadgeStateExample() {
  return (
    <div className="space-y-4 p-6">
      <h2 className="mb-4 text-2xl font-bold">BadgeState Component Examples</h2>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Available States</h3>
        <div className="flex flex-wrap gap-2">
          <BadgeState state="yes" tooltip="Yes" />
          <BadgeState state="no" tooltip="No" />
          <BadgeState state="personal" tooltip="Personal" />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Without Colors</h3>
        <div className="flex flex-wrap gap-2">
          <BadgeState state="yes" noColor />
          <BadgeState state="no" noColor />
          <BadgeState state="personal" noColor />
        </div>
      </div>
    </div>
  );
}
