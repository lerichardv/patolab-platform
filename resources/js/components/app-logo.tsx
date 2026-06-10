export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square h-8 w-8 shrink-0 items-center justify-center text-sidebar-primary-foreground">
                <img
                    src="/images/patolab-isotipo.png"
                    alt="PatoLab Logo"
                    className="size-8 object-contain transition-all duration-200 group-data-[collapsible=icon]:size-6"
                />
            </div>
            <div className="ml-1 grid flex-1 text-left text-2xl group-data-[collapsible=icon]:hidden">
                <span className="mb-0.5 truncate leading-tight font-bold">
                    <span className="text-accent">Pato</span>
                    <span className="text-primary">Lab</span>
                </span>
            </div>
        </>
    );
}
