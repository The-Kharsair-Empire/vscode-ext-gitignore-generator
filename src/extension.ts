// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as https from "https";

const default_settings = {
    url: "https://www.toptal.com/developers/gitignore/api/",
    projectType: {
        Unity: {
            url_suffix: "unity",
        },
        Nodejs: {
            url_suffix: "node",
        },
        Python: {
            url_suffix: "python",
        },
        AngularJS: {
            url_suffix: "angular",
        },
    },
};

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const settings_filepath = path.join(context.extensionPath, "settings.json");

    let disposableGenerateGitignore = vscode.commands.registerCommand(
        "gitignore-generator.generateGitignoreFile",
        async () => {
            let settings;
            if (fs.existsSync(settings_filepath)) {
                const settings_data = fs.readFileSync(
                    settings_filepath,
                    "utf8"
                );
                settings = JSON.parse(settings_data);
            } else {
                settings = default_settings;
            }

            if (settings) {
                const default_url = settings.url;
                const options = Object.keys(settings.projectType);
                const selected = await vscode.window.showQuickPick(options, {
                    placeHolder: "Choose your project type",
                });

                if (selected) {
                    const selected_url =
                        default_url + settings.projectType[selected].url_suffix;

                    const workspaceFolders = vscode.workspace.workspaceFolders;

                    if (workspaceFolders) {
                        if (workspaceFolders.length === 0) {
                            vscode.window.showInformationMessage(
                                "No project in workspace"
                            );
                        } else {
                            let picked_project_path;
                            if (workspaceFolders.length === 1) {
                                picked_project_path =
                                    workspaceFolders[0].uri.fsPath;
                            } else {
                                const projects = workspaceFolders.map(
                                    (folder) => folder.name
                                );
                                const selectedFolder =
                                    await vscode.window.showQuickPick(
                                        projects,
                                        {
                                            placeHolder:
                                                "Choose a project folder",
                                        }
                                    );

                                if (!selectedFolder) {
                                    return; // User cancelled the folder selection
                                }

                                const folder = workspaceFolders.find(
                                    (folder) => folder.name === selectedFolder
                                );
                                if (folder) {
                                    picked_project_path = folder.uri.fsPath;
                                } else {
                                    vscode.window.showInformationMessage(
                                        "Cannot find folder path of the selected project"
                                    );
                                    return;
                                }
                            }

                            const gitignore_filepath = path.join(
                                picked_project_path,
                                ".gitignore"
                            );
                            if (fs.existsSync(gitignore_filepath)) {
                                vscode.window.showInformationMessage(
                                    ".gitignore file already exist, delete it if you want to generate it using this plugin"
                                );
                            } else {
                                https
                                    .get(selected_url, (resp) => {
                                        let data = "";
                                        resp.on("data", (chunk) => {
                                            data += chunk;
                                        });

                                        resp.on("end", () => {
                                            fs.writeFileSync(
                                                gitignore_filepath,
                                                data
                                            );
                                        });
                                    })
                                    .on("error", (err) => {
                                        vscode.window.showErrorMessage(
                                            "Error: " + err.message
                                        );
                                    });
                            }
                        }
                    } else {
                        vscode.window.showInformationMessage(
                            "No active workspace"
                        );
                    }
                } else {
                    vscode.window.showInformationMessage(
                        "Did not choose any project type"
                    );
                }
            } else {
                vscode.window.showInformationMessage(
                    "Cannot find your settings"
                );
            }
        }
    );

    let disposableOpenSettings = vscode.commands.registerCommand(
        "gitignore-generator.openSettings",
        async () => {
            if (!fs.existsSync(settings_filepath)) {
                fs.writeFileSync(
                    settings_filepath,
                    JSON.stringify(default_settings, null, 4)
                );
            }

            const document = await vscode.workspace.openTextDocument(
                settings_filepath
            );
            vscode.window.showTextDocument(document);
        }
    );

    context.subscriptions.push(
        disposableGenerateGitignore,
        disposableOpenSettings
    );
}

// This method is called when your extension is deactivated
export function deactivate() {}
