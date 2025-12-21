function StatsCard({ icon, value, label, color = 'blue' }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    red: 'bg-red-50 text-red-700',
    green: 'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
    purple: 'bg-purple-50 text-purple-700'
  };

  return (
    <div className={`rounded-xl p-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm opacity-75">{label}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

export default StatsCard;
