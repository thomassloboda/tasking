var configuration = {
  db: {
    name: "tasking",
    version: "1.0.0",
    description: "Tasking database",
    size: 32678
  }
};

function Database() {
  var db = openDatabase(
    configuration.db.name,
    configuration.db.version,
    configuration.db.description,
    configuration.db.size
  );

  var createTable = function(successCallback, errCallback) {
    db.transaction(function(transaction) {
      transaction.executeSql(
        "CREATE TABLE IF NOT EXISTS tasks (" +
          "id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT," +
          "text TEXT NOT NULL, state INTEGER NOT NULL);",
        null,
        function(transaction, results) {
          successCallback(results);
        },
        errCallback
      );
    });
  };

  var dropTable = function(successCallback, errCallback) {
    db.transaction(function(transaction) {
      transaction.executeSql(
        "DROP TABLE tasks;",
        null,
        function(transaction, results) {
          successCallback(results);
        },
        errCallback
      );
    });
  };

  var createTask = function(text, state, successCallback, errCallback) {
    db.transaction(function(transaction) {
      transaction.executeSql(
        "INSERT INTO tasks (text, state) VALUES (?, ?);",
        [text, state],
        function(transaction, results) {
          successCallback(results);
        },
        errCallback
      );
    });
  };

  var updateTask = function(id, text, state, successCallback, errCallback) {
    db.transaction(function(transaction) {
      transaction.executeSql(
        "UPDATE tasks set text = ? , state = ? WHERE id = ?;",
        [text, state, id],
        function(transaction, results) {
          successCallback(results);
        },
        errCallback
      );
    });
  };

  var loadTasks = function(successCallback, errCallback) {
    db.transaction(function(transaction) {
      transaction.executeSql(
        "SELECT * FROM tasks;",
        null,
        function(transaction, results) {
          successCallback(results);
        },
        errCallback
      );
    });
  };

  var deleteTask = function(id, successCallback, errCallback) {
    db.transaction(function(transaction) {
      transaction.executeSql(
        "DELETE FROM tasks WHERE id = ?;",
        [id],
        function(transaction, results) {
          successCallback(results);
        },
        errCallback
      );
    });
  };

  createTable(function() {});

  return {
    loadTasks: loadTasks,
    createTask: createTask,
    updateTask: updateTask,
    deleteTask: deleteTask,
    createTable: createTable,
    dropTable: dropTable
  };
}

var database = new Database();
var tasks = [];

function stateToEmojis(state) {
  switch (state) {
    case 1:
      return "〰️";
    case 2:
      return "✔️";
    default:
      return "❔";
  }
}

document.querySelector("#newtask").close();

document.addEventListener("keyup", function(evt) {
  var dialog = document.querySelector("#newtask");
  if (!dialog.open) {
    if (evt.keyCode === 73) {
      importFile();
    } else if (evt.keyCode === 78) {
      dialog.showModal();
    } else if (evt.keyCode === 88) {
      download(new Date().getTime() + ".json", JSON.stringify(tasks));
    }
  }
});

function copy(text) {
  var elem = document.createElement("input");
  document.body.appendChild(elem);
  elem.value = text;
  elem.select();
  document.execCommand("copy");
  elem.remove();
}

function download(filename, text) {
  var element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(text)
  );
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

function importFile() {
  var element = document.createElement("input");
  element.type = "file";
  element.style.display = "none";
  document.body.appendChild(element);
  element.addEventListener("change", function(evt) {
    var fileReader = new FileReader();
    fileReader.addEventListener("loadend", function(evt) {
      var json = JSON.parse(evt.target.result);
      element.remove();
      database.dropTable(
        function() {
          database.createTable(
            function() {
              json.forEach(function(item) {
                if ("text" in item && "state" in item) {
                  database.createTask(
                    item.text,
                    item.state,
                    function() {
                      init();
                    },
                    function(error) {
                      console.error(error);
                    }
                  );
                }
              });
            },
            function(error) {
              console.error(error);
            }
          );
        },
        function(error) {
          console.error(error);
        }
      );
    });
    fileReader.readAsText(evt.target.files[0]);
  });
  element.click();
}

document.querySelector("#newtask_cancel").addEventListener("click", function() {
  document.querySelector("#newtask").close();
  document.querySelector("#newtask_text").value = "";
});
document
  .querySelector("#newtask_confirm")
  .addEventListener("click", function() {
    createTask();
  });
document
  .querySelector("#newtask_text")
  .addEventListener("keyup", function(evt) {
    if (evt.keyCode === 13 && document.querySelector("#newtask").open) {
      createTask();
    }
  });

function createTask() {
  var value = document.querySelector("#newtask_text").value;
  if (value.trim() !== "") {
    database.createTask(
      value,
      0,
      function(result) {
        document.querySelector("#newtask").close();
        document.querySelector("#newtask_text").value = "";
        init();
      },
      function(error) {
        console.error(error);
      }
    );
  }
}

function onStateClick(evt) {
  var currentState = parseInt(evt.target.getAttribute("data_state"));
  var currentIndex = parseInt(evt.target.parentNode.getAttribute("data_index"));
  if (currentState >= 2) {
    currentState = -1;
  }
  database.updateTask(
    currentIndex,
    tasks.find(function(task) {
      return task.id === currentIndex;
    }).text,
    currentState + 1,
    function(result) {
      evt.target.innerText = stateToEmojis(currentState + 1);
      evt.target.setAttribute("data_state", currentState + 1);
    },
    function(error) {
      console.error(error);
    }
  );
}

function onItemDelete(evt) {
  var id = parseInt(evt.target.parentNode.getAttribute("data_index"));
  database.deleteTask(
    id,
    function() {
      init();
    },
    function(error) {
      console.error(error);
    }
  );
}

function onCopy(evt) {
  copy(evt.target.innerText);
}

function renderTasks() {
  var list = document.querySelector("#tasks");
  document.querySelectorAll(".task").forEach(function(element) {
    element.remove();
  });
  tasks
    .sort(function(a, b) {
      if (a.id > b.id) {
        return 1;
      } else if (a.id < b.id) {
        return -1;
      } else {
        return 0;
      }
    })
    .forEach(task => {
      var item = document.createElement("div");
      item.classList.add("task");
      item.addEventListener("dblclick", onCopy);
      item.setAttribute("data_index", task.id);
      var itemText = document.createElement("div");
      itemText.innerText = task.text;
      itemText.setAttribute("id", "task_" + task.id);
      item.appendChild(itemText);
      var itemState = document.createElement("div");
      itemState.innerText = stateToEmojis(task.state);
      itemState.setAttribute("data_state", task.state);
      itemState.addEventListener("click", onStateClick);
      item.appendChild(itemState);
      var itemDelete = document.createElement("div");
      itemDelete.addEventListener("click", onItemDelete);
      itemDelete.innerText = "❌";
      item.appendChild(itemDelete);
      list.appendChild(item);
    });
}

function init() {
  database.loadTasks(
    function(result) {
      tasks = Object.keys(result.rows).map(function(index) {
        return result.rows[index];
      });
      renderTasks();
    },
    function(error) {
      console.error(error);
    }
  );
}

init();
