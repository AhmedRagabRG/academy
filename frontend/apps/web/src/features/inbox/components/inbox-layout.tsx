export function InboxLayout({
  sidebar,
  list,
  workspace,
  details,
  pane,
}: {
  sidebar: React.ReactNode
  list: React.ReactNode
  workspace: React.ReactNode
  details: React.ReactNode
  pane: "list" | "conversation" | "details"
}) {
  return (
    <div className="grid h-dvh min-h-0 overflow-hidden bg-card lg:grid-cols-[15rem_22rem_minmax(24rem,1fr)] xl:grid-cols-[15rem_23rem_minmax(28rem,1fr)_20rem]">
      <aside className="hidden overflow-y-auto border-e p-3 lg:block">
        {sidebar}
      </aside>
      <section
        aria-label="قائمة المحادثات"
        className={`${pane === "list" ? "flex" : "hidden"} min-h-0 flex-col border-e lg:flex`}
      >
        {list}
      </section>
      <main
        aria-label="مساحة المحادثة"
        className={`${pane === "conversation" ? "flex" : "hidden"} min-h-0 flex-col lg:flex`}
      >
        {workspace}
      </main>
      <aside
        aria-label="تفاصيل العميل"
        className={`${pane === "details" ? "block" : "hidden"} overflow-y-auto p-4 xl:block`}
      >
        {details}
      </aside>
    </div>
  )
}
