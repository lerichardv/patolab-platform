export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square items-center justify-center text-sidebar-primary-foreground">
                <img src="/images/patolab-isotipo.png" alt="PatoLab Logo" className="size-8" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-2xl">
                <span className="mb-0.5 truncate leading-tight font-bold">
                    <span className="text-accent">Pato</span><span className="text-primary">Lab</span>
                </span>
            </div>
        </>
    );
}
