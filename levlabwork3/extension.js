const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

/**
 * Рекурсивная функция для поиска .cpp файлов в заданной директории
 * @param {string} dirPath - Текущая директория для поиска
 * @param {string} basePath - Базовая директория проекта для формирования относительных путей
 * @param {Array<string>} fileList - Массив для хранения путей файлов
 */
function findCppFiles(dirPath, basePath, fileList) {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        const relativePath = path.relative(basePath, fullPath);

        if (fs.statSync(fullPath).isDirectory()) {
            // Рекурсивно проходим по поддиректориям
            findCppFiles(fullPath, basePath, fileList);
        } else if (file.endsWith('.cpp')) {
            // Добавляем относительный путь .cpp файла
            fileList.push(relativePath.replace(/\\/g, '/')); // Приведение путей к формату Unix
        }
    });
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    const disposable = vscode.commands.registerCommand('levlabwork3.create_cmakelists', function () {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('Нет открытой рабочей области!');
            return;
        }

        const rootPath = workspaceFolders[0].uri.fsPath;
        const projectName = path.basename(rootPath);

        // Поиск всех .cpp файлов только в директориях 'lib' и 'bin'
        let sourceFiles = [];
        const directoriesToSearch = ['lib', 'bin'];

        directoriesToSearch.forEach(dir => {
            const dirPath = path.join(rootPath, dir);
            if (fs.existsSync(dirPath)) {
                findCppFiles(dirPath, rootPath, sourceFiles);
            }
        });

        // Создание строки для set(SOURCES ...)
        const sourcesList = sourceFiles.map(file => `    ${file}`).join('\n');

        const filePath = vscode.Uri.file(`${rootPath}/CMakeLists.txt`);

        // Содержимое шаблона CMakeLists.txt
        const cmakeContent = `cmake_minimum_required(VERSION 3.10)

project(${projectName})

set(SOURCES
${sourcesList}
)

add_executable(${projectName} \${SOURCES})

include_directories(lib) 
include_directories(bin) 

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED True)
`;

        vscode.workspace.fs.writeFile(filePath, Buffer.from(cmakeContent))
            .then(() => {
                vscode.window.showInformationMessage('Файл CMakeLists.txt создан.');
            }, (error) => {
                vscode.window.showErrorMessage(`Ошибка при создании файла: ${error}`);
            });
    });

    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
