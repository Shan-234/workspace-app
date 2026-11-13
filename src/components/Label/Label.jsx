import './Label.css';

export default function Label({ name, color = "#6366F1", size = "medium" }) {
    return (
        <span
            className={`label label-${size}`}
            style={{
                backgroundColor: `${color}20`,
                color: color,
                borderColor: `${color}55`
            }}
        >
            <span
                className="label-dot"
                style={{ backgroundColor: color }}
            />
            {name}
        </span>
    );
}