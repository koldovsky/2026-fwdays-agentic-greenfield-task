export async function Feedback({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) { const value = await searchParams; return <>{value.success && <div className="notice success" role="status">{value.success}</div>}{value.error && <div className="notice error" role="alert">{value.error}</div>}</>; }

