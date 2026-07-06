import { toHtml } from "../general.utils";
import { RankingDiff } from "./people.controller";
import { PeopleModel, PersonRankList } from "./people.model";

/**
 * Context passed to the PeopleView. The controller (`PeopleController`) implements
 * this interface and supplies the model and callbacks the view needs to operate.
 */
export interface PeopleViewContext {
    model: PeopleModel;
    updateRanking: (diff: RankingDiff) => void;
    getPeopleAndRank: () => PersonRankList;
    deletePerson: (id: string) => void;
    updatePersonPoints: (id: string, points: number) => void;
}

/**
 * View responsible for rendering the people list and handling the person actions dialog.
 *
 * Expected DOM structure / IDs:
 * - A container table body with id `people-list-container` where rows are appended.
 * - A dialog element with id `person-actions-dialog` containing:
 *   - an element `#person-dialog-name` to show the person's name
 *   - an `input[name="points"]` to edit points
 *   - buttons with ids `person-dialog-delete` and `person-dialog-cancel`
 *   - a submit `input[type="submit"]` to save changes
 */
export class PeopleView {
    readonly peopleListContainer = "people-list-container";
    readonly dialog = "person-actions-dialog";
    context: PeopleViewContext;

    constructor(context: PeopleViewContext) {
        this.context = context;
        this.attachListeners();
    }

    render(): void {
        const container = document.getElementById(this.peopleListContainer)!;
        container.innerHTML = "";
        for (const pr of this.context.getPeopleAndRank()) {
            const row = toHtml(`
                <tr data-id="${pr.person.id}">
                    <th scope="row">${pr.person.name}</th>
                    <td>${pr.rank.points}</td>
                    <td><button class="secondary">Mostra azioni</button></td>
                </tr>
            `);
            container.appendChild(row);
        }
    }

    openActionsDialog(personId: string) {
        const dialog = document.getElementById('person-actions-dialog') as HTMLDialogElement;
        dialog.dataset.id = personId;
        const name = dialog.querySelector("#person-dialog-name");
        if(!!name) name.textContent = this.context.model.list.get(personId)?.name ?? ""
        const input = dialog.querySelector('input[name="points"]') as HTMLInputElement;
        input.value = String(this.context.model.ranking.get(personId)?.points ?? 0);
        dialog.showModal();
    }

    attachListeners() {
        const container = document.getElementById(this.peopleListContainer);
        container?.addEventListener('click', (event) => {
            const btn = (event.target as HTMLElement).closest('button');
            if (!btn || !container.contains(btn)) return;

            const row = btn.closest('tr');
            if (!row) return;

            const personId = row.getAttribute('data-id');
            if (!personId) return;

            this.openActionsDialog(personId);
        });

        const dialog = document.getElementById('person-actions-dialog') as HTMLDialogElement;
        const deleteBtn = document.getElementById('person-dialog-delete') as HTMLButtonElement;
        const saveBtn = dialog.querySelector('input[type="submit"]') as HTMLInputElement;
        const cancelBtn = document.getElementById('person-dialog-cancel') as HTMLButtonElement;
        deleteBtn.addEventListener('click', () => {
            const personId = dialog.dataset.id;
            if (!personId) return;
            this.context.deletePerson(personId);
            dialog.close();
        });
        saveBtn.addEventListener('click', (event) => {
            event.preventDefault();

            const personId = dialog.dataset.id;
            if (!personId) return;

            const input = dialog.querySelector('input[name="points"]') as HTMLInputElement;
            const points = Number(input.value);

            this.context.updatePersonPoints(personId, points);

            dialog.close();
        });
        cancelBtn.addEventListener('click', () => {
            dialog.close();
        });
        dialog.addEventListener('close', () => {
            delete dialog.dataset.id;
        });
    }

}