import { useMemo, useState } from 'react';
import { Ban, LockOpen, Pencil, Search, Trash2, UserPlus, UserSearch } from 'lucide-react';
import { useLineStatus } from '@/hooks/useLineStatus';
import { useCreateEmployee, useDeleteEmployee, useProjects, useToggleBlock, useUpdateEmployee } from '@/hooks/useEmployees';
import { OperatorDialog } from '@/components/admin/OperatorDialog';
import { ConfirmDialog, useConfirm } from '@/components/common/ConfirmDialog';
import { Panel } from '@/components/common/Panel';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/common/DataState';
import { PersonCell } from '@/components/common/PersonCell';
import { LineTag, PlainTag } from '@/components/common/StatusTag';
import { Table, THead, TH, TR, TD } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMinutes } from '@/lib/time';
import type { EmployeeListItem } from '@/types/domain';
import type { LineState } from '@/types/database';

export default function OperatorsPage() {
  const line = useLineStatus();
  const { data: projects } = useProjects();

  const [query, setQuery] = useState('');
  const [project, setProject] = useState('');
  const [state, setState] = useState<'' | LineState>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeListItem | null>(null);

  const create = useCreateEmployee();
  const update = useUpdateEmployee();
  const block = useToggleBlock();
  const remove = useDeleteEmployee();
  const { config, ask, close } = useConfirm();

  const rows: EmployeeListItem[] = useMemo(
    () =>
      (line.data ?? []).map((r) => ({
        employeeId: r.employee_id,
        userId: r.user_id,
        fullName: r.full_name,
        email: r.email,
        project: r.project,
        schedule: r.default_schedule,
        lineState: r.line_state,
        startedLabel: r.started_label,
        todayMinutes: r.today_minutes,
        extraHours: r.extra_hours ?? 0,
        blocked: r.blocked,
      })),
    [line.data],
  );

  const filtered = rows.filter((r) => {
    const q = query.trim().toLowerCase();
    const okQ = !q || r.fullName.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
    const okP = !project || r.project === project;
    const okS = !state || r.lineState === state;
    return okQ && okP && okS;
  });

  const resetFilters = () => {
    setQuery('');
    setProject('');
    setState('');
  };

  const selectClass =
    'h-9 rounded-sm border border-line-soft bg-surface-1 px-[11px] text-[0.84rem] ' +
    'transition-colors hover:border-line focus:border-ember focus:outline-none';

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-[10px] size-[15px] text-ink-3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по имени или email"
            className="h-9 min-w-[230px] pl-8 text-[0.84rem]"
          />
        </div>

        <select className={selectClass} value={project} onChange={(e) => setProject(e.target.value)}>
          <option value="">Все проекты</option>
          {projects?.map((p) => (
            <option key={p.id} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>

        <select className={selectClass} value={state} onChange={(e) => setState(e.target.value as LineState | '')}>
          <option value="">Любой статус</option>
          <option value="online">На линии</option>
          <option value="offline">Не на линии</option>
          <option value="late">Опоздание</option>
          <option value="blocked">Заблокирован</option>
        </select>

        <Button
          className="ml-auto"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <UserPlus />
          Создать оператора
        </Button>
      </div>

      <Panel>
        {line.isLoading ? (
          <TableSkeleton rows={7} cols={6} />
        ) : line.isError ? (
          <div className="p-5">
            <ErrorState error={line.error} onRetry={() => void line.refetch()} />
          </div>
        ) : !filtered.length ? (
          <EmptyState
            icon={UserSearch}
            title={rows.length ? 'Никого не нашли' : 'Операторов ещё нет'}
            text={
              rows.length
                ? 'Под фильтры не попал ни один сотрудник. Сбросьте условия или создайте нового оператора.'
                : 'Создайте первую учётную запись: оператор получит доступ и сможет отмечаться на линии.'
            }
            action={
              rows.length ? (
                <Button variant="secondary" onClick={resetFilters}>
                  Сбросить фильтры
                </Button>
              ) : (
                <Button onClick={() => setDialogOpen(true)}>
                  <UserPlus />
                  Создать оператора
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Сотрудник</TH>
                <TH>Проект</TH>
                <TH>График</TH>
                <TH>Статус</TH>
                <TH>Сегодня</TH>
                <TH className="text-right">Действия</TH>
              </tr>
            </THead>
            <tbody>
              {filtered.map((r) => (
                <TR key={r.employeeId}>
                  <TD>
                    <PersonCell name={r.fullName} email={r.email} online={r.lineState === 'online'} />
                  </TD>
                  <TD>
                    <PlainTag>{r.project}</PlainTag>
                  </TD>
                  <TD className="num">{r.schedule}</TD>
                  <TD>
                    <LineTag state={r.lineState} />
                  </TD>
                  <TD className="num">
                    {r.todayMinutes ? formatMinutes(r.todayMinutes) : '—'}
                    {r.extraHours > 0 && (
                      <span className="ml-2">
                        <PlainTag tone="ember">+{r.extraHours.toFixed(1)} ч</PlainTag>
                      </span>
                    )}
                  </TD>
                  <TD>
                    <div className="flex justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Редактировать"
                        onClick={() => {
                          setEditing(r);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={r.blocked ? 'Разблокировать' : 'Заблокировать'}
                        onClick={() =>
                          ask({
                            title: r.blocked ? 'Разблокировать оператора?' : 'Заблокировать оператора?',
                            description: r.blocked
                              ? `${r.fullName} снова сможет входить в систему и выходить на линию.`
                              : `${r.fullName} потеряет доступ немедленно. Активная смена будет закрыта автоматически.`,
                            confirmLabel: r.blocked ? 'Разблокировать' : 'Заблокировать',
                            destructive: !r.blocked,
                            onConfirm: () => {
                              block.mutate({ employeeId: r.employeeId, blocked: !r.blocked });
                              close();
                            },
                          })
                        }
                      >
                        {r.blocked ? <LockOpen /> : <Ban />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Удалить"
                        className="hover:bg-danger-dim hover:text-danger"
                        onClick={() =>
                          ask({
                            title: 'Удалить оператора?',
                            description: `${r.fullName} будет удалён из системы. История смен останется в отчётах, доступ отзывается сразу.`,
                            confirmLabel: 'Удалить навсегда',
                            destructive: true,
                            onConfirm: () => {
                              remove.mutate(r.employeeId);
                              close();
                            },
                          })
                        }
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      <OperatorDialog
        open={dialogOpen}
        editing={editing}
        pending={create.isPending || update.isPending}
        onOpenChange={setDialogOpen}
        onSubmit={(values) => {
          if (editing) {
            update.mutate(
              { employeeId: editing.employeeId, input: values },
              { onSuccess: () => setDialogOpen(false) },
            );
          } else {
            create.mutate(values, { onSuccess: () => setDialogOpen(false) });
          }
        }}
      />

      <ConfirmDialog
        config={config}
        onOpenChange={(o) => !o && close()}
        pending={block.isPending || remove.isPending}
      />
    </>
  );
}
