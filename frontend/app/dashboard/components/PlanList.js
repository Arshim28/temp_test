'use client';

export default function PlanList({ plans, options }) {
    const groupedPlans = {
        District: [],
        Taluka: [],
        Village: [],
    };

    plans.forEach((plan) => groupedPlans[plan.plan_type].push(plan));

    return (
        <>
            {['District', 'Taluka', 'Village'].map((type) => (
                <div key={type} className="plans-container">
                    <h3 className="section-heading">{type} Plans</h3>
                    <div className="plans-grid">
                        {groupedPlans[type].length > 0 ? (
                            groupedPlans[type].map((plan) => (
                                <div className="plan-card" key={plan.id}>
                                    <h3>{plan.entity_name}</h3>
                                    <p>Total Transactions: {plan.total_transactions}</p>
                                    <p>Purchased At: {new Date(plan.created_at).toLocaleDateString('en-GB', options)}</p>
                                    <p>Valid Till: {new Date(plan.valid_till).toLocaleDateString('en-GB', options)}</p>
                                </div>
                            ))
                        ) : (
                            <p>No {type.toLowerCase()} plans registered yet.</p>
                        )}
                    </div>
                </div>
            ))}
        </>
    );
}
