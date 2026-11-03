type StringValues<T> = {
  [K in keyof T]: string;
};

type StringValues2<T extends object> = {
  [K in keyof T]: string;
}


interface User {
  id: number;
  name: string;
}

const user: StringValues<{ id: string }> = {
  id: '1',
}



console.log(user);