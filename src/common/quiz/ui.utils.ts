async function showChoiceDialog(hasDatabase: boolean, hasFile: boolean): Promise<'file' | 'database-restart' | 'database-continue' | null> {
    return new Promise((resolve) => {
        const dialog = document.querySelector<HTMLDialogElement>('#quiz-choice-dialog');
        if (!dialog) {
            console.error('Quiz choice dialog not found in DOM');
            resolve(null);
            return;
        }

        const fileBtn = document.querySelector<HTMLButtonElement>('#quiz-load-file');
        const dbContinueBtn = document.querySelector<HTMLButtonElement>('#quiz-load-db-continue');
        const dbRestartBtn = document.querySelector<HTMLButtonElement>('#quiz-load-db-restart');

        if (!fileBtn || !dbContinueBtn || !dbRestartBtn) {
            console.error('Quiz choice dialog buttons not found in DOM');
            resolve(null);
            return;
        }

        // Configure button states
        fileBtn.disabled = !hasFile;
        dbContinueBtn.disabled = !hasDatabase;
        dbRestartBtn.disabled = !hasDatabase;

        // Clear previous event listeners by cloning
        const newFileBtn = fileBtn.cloneNode(true) as HTMLButtonElement;
        const newDbContinueBtn = dbContinueBtn.cloneNode(true) as HTMLButtonElement;
        const newDbRestartBtn = dbRestartBtn.cloneNode(true) as HTMLButtonElement;

        fileBtn.replaceWith(newFileBtn);
        dbContinueBtn.replaceWith(newDbContinueBtn);
        dbRestartBtn.replaceWith(newDbRestartBtn);

        // Attach new event listeners
        newFileBtn.addEventListener('click', () => {
            dialog.close();
            resolve('file');
        });

        newDbContinueBtn.addEventListener('click', () => {
            dialog.close();
            resolve('database-continue');
        });

        newDbRestartBtn.addEventListener('click', () => {
            dialog.close();
            resolve('database-restart');
        });

        dialog.showModal();
    });
}

export { showChoiceDialog };