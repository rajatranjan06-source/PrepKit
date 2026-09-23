import os  
base = r'C:/Users/rajat/PrepKit'  
os.makedirs(os.path.join(base, 'src', 'services'), exist_ok=True)  
os.makedirs(os.path.join(base, 'src', 'lib'), exist_ok=True)  
os.makedirs(os.path.join(base, 'src', 'types'), exist_ok=True)  
os.makedirs(os.path.join(base, 'src', 'utils'), exist_ok=True)  
os.makedirs(os.path.join(base, 'src', 'app'), exist_ok=True)  
os.makedirs(os.path.join(base, 'src', 'components'), exist_ok=True)  
os.makedirs(os.path.join(base, 'tests'), exist_ok=True) 
def write_file(path, content):  
    with open(path, 'w', encoding='utf-8') as f:  
        f.write(content)  
    print(f'Written: {path}') 
